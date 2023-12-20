import { Inject, Injectable } from '@nestjs/common';
import { range } from '@lido-nestjs/utils';
import { LOGGER_PROVIDER, LoggerService } from 'common/logger';
import { ConfigService } from 'common/config';
import { JobService } from 'common/job';
import { OneAtTime } from 'common/decorators/oneAtTime';
import { SchedulerRegistry } from '@nestjs/schedule';
import { StakingRouterService } from 'staking-router-modules/staking-router.service';
import { StakingRouterFetchService } from 'staking-router-modules/contracts';
import { ElMetaStorageService } from 'storage/el-meta.storage';
import { EntityManager } from '@mikro-orm/knex';
import { ExecutionProviderService } from 'common/execution-provider';
import { SRModuleStorageService } from 'storage/sr-module.storage';
import { IsolationLevel } from '@mikro-orm/core';
import { PrometheusService } from 'common/prometheus';
import { SrModuleEntity } from 'storage/sr-module.entity';
import { StakingModule, StakingModuleInterface } from 'staking-router-modules/interfaces/staking-module.interface';
import { UpdaterPayload, UpdaterState } from './keys-update.interfaces';

const MAX_BLOCKS_OVERLAP = 30;

class KeyOutdatedError extends Error {
  lastBlock: number;

  constructor(message, lastBlock) {
    super(message);
    this.lastBlock = lastBlock;
  }
}

@Injectable()
export class KeysUpdateService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected readonly configService: ConfigService,
    protected readonly jobService: JobService,
    protected readonly schedulerRegistry: SchedulerRegistry,
    protected readonly stakingRouterService: StakingRouterService,
    protected readonly stakingRouterFetchService: StakingRouterFetchService,
    protected readonly elMetaStorage: ElMetaStorageService,
    protected readonly entityManager: EntityManager,
    protected readonly executionProvider: ExecutionProviderService,
    protected readonly srModulesStorage: SRModuleStorageService,
    protected readonly prometheusService: PrometheusService,
  ) {}

  protected lastTimestampSec: number | undefined = undefined;
  protected lastBlockNumber: number | undefined = undefined;

  // name of interval for updating keys
  public UPDATE_KEYS_JOB_NAME = 'SRModulesKeysUpdate';
  // timeout for update keys
  // if during 30 minutes nothing happen we will exit
  UPDATE_KEYS_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  updateDeadlineTimer: undefined | NodeJS.Timeout = undefined;

  /**
   * Initializes the job
   */
  public async initialize(): Promise<void> {
    // at first start timer for checking update
    // if timer isn't cleared in 30 minutes period, we will consider it as nodejs frizzing and exit
    this.checkKeysUpdateTimeout();
    await this.updateKeys().catch((error) => this.logger.error(error));

    const interval_ms = this.configService.get('UPDATE_KEYS_INTERVAL_MS');
    const interval = setInterval(() => this.updateKeys().catch((error) => this.logger.error(error)), interval_ms);
    this.schedulerRegistry.addInterval(this.UPDATE_KEYS_JOB_NAME, interval);

    this.logger.log('Finished KeysUpdateService initialization');
  }

  private checkKeysUpdateTimeout() {
    const currTimestampSec = new Date().getTime() / 1000;
    // currTimestampSec - this.lastTimestampSec - time since last update in seconds
    // this.UPDATE_KEYS_TIMEOUT_MS / 1000 - timeout in seconds
    // so if time since last update is less than timeout, this means keys are updated
    const isUpdated =
      this.lastTimestampSec && currTimestampSec - this.lastTimestampSec < this.UPDATE_KEYS_TIMEOUT_MS / 1000;

    if (this.updateDeadlineTimer && isUpdated) clearTimeout(this.updateDeadlineTimer);

    this.updateDeadlineTimer = setTimeout(async () => {
      const error = new KeyOutdatedError(
        `There were no keys update more than ${this.UPDATE_KEYS_TIMEOUT_MS / (1000 * 60)} minutes`,
        this.lastBlockNumber,
      );
      this.logger.error(error);
      process.exit(1);
    }, this.UPDATE_KEYS_TIMEOUT_MS);
  }

  /**
   * Collects updates from the registry contract and saves the changes to the database
   */
  @OneAtTime()
  private async updateKeys(): Promise<void> {
    await this.jobService.wrapJob({ name: 'Update Staking Router Modules keys' }, async () => {
      const meta = await this.update();
      await this.updateMetrics();

      if (meta) {
        this.lastBlockNumber = meta.number;
        this.lastTimestampSec = meta.timestamp;
      }

      // clear timeout
      this.checkKeysUpdateTimeout();
    });
  }

  /**
   * Update keys of staking modules
   * @returns Number, hash and timestamp of execution layer block
   */
  public async update(): Promise<{ number: number; hash: string; timestamp: number } | undefined> {
    // reading latest block from blockchain
    const currElMeta = await this.executionProvider.getBlock('latest');
    // read from database last execution layer data
    const prevElMeta = await this.elMetaStorage.get();

    // handle the situation when the node has fallen behind the service state
    if (prevElMeta && prevElMeta?.blockNumber > currElMeta.number) {
      this.logger.warn('Previous data is newer than current data', prevElMeta);
      return;
    }

    if (prevElMeta?.blockHash && prevElMeta.blockHash === currElMeta.hash) {
      this.logger.debug?.('same state, skip', { prevElMeta, currElMeta });
      return;
    }

    // Get modules from storage
    const storageModules = await this.srModulesStorage.findAll();
    // Get staking modules from SR contract
    const contractModules = await this.stakingRouterFetchService.getStakingModules({ blockHash: currElMeta.hash });

    //Is this scenario impossible ?
    if (this.modulesWereDeleted(contractModules, storageModules)) {
      const error = new Error('Modules list is wrong');
      this.logger.error(error);
      process.exit(1);
    }

    await this.entityManager.transactional(
      async () => {
        await this.updateStakingModules({ currElMeta, prevElMeta, contractModules });
      },
      { isolationLevel: IsolationLevel.READ_COMMITTED },
    );

    return currElMeta;
  }

  public async updateStakingModules(updaterPayload: UpdaterPayload): Promise<void> {
    const { prevElMeta, currElMeta, contractModules } = updaterPayload;
    const prevBlockHash = prevElMeta?.blockHash;
    const currentBlockHash = currElMeta.hash;

    const updaterState: UpdaterState = {
      lastChangedBlockHash: prevBlockHash || currentBlockHash,
      isReorgDetected: false,
    };

    for (const contractModule of contractModules) {
      const { stakingModuleAddress } = contractModule;

      // Find implementation for staking module
      const moduleInstance = this.stakingRouterService.getStakingRouterModuleImpl(contractModule.type);
      // Read current nonce from contract
      const currNonce = await moduleInstance.getCurrentNonce(stakingModuleAddress, currentBlockHash);
      // Read module in storage
      const moduleInStorage = await this.srModulesStorage.findOneById(contractModule.moduleId);
      const prevNonce = moduleInStorage?.nonce;

      this.logger.log(`Nonce previous value: ${prevNonce}, nonce current value: ${currNonce}`);

      if (!prevBlockHash) {
        this.logger.log('No past state found, start indexing', { stakingModuleAddress, currentBlockHash });

        await this.updateStakingModule(
          updaterState,
          moduleInstance,
          contractModule,
          stakingModuleAddress,
          currNonce,
          currentBlockHash,
        );
        continue;
      }

      if (prevNonce !== currNonce) {
        this.logger.log('Nonce has been changed, start indexing', {
          stakingModuleAddress,
          currentBlockHash,
          prevNonce,
          currNonce,
        });

        await this.updateStakingModule(
          updaterState,
          moduleInstance,
          contractModule,
          stakingModuleAddress,
          currNonce,
          currentBlockHash,
        );
        continue;
      }

      if (this.isTooMuchDiffBetweenBlocks(prevElMeta.blockNumber, currElMeta.number)) {
        this.logger.log('Too much difference between the blocks, start indexing', {
          stakingModuleAddress,
          currentBlockHash,
        });

        await this.updateStakingModule(
          updaterState,
          moduleInstance,
          contractModule,
          stakingModuleAddress,
          currNonce,
          currentBlockHash,
        );
        continue;
      }

      if (await this.isReorgDetected(updaterState, prevBlockHash, currentBlockHash)) {
        this.logger.log('Reorg detected, start indexing', { stakingModuleAddress, currentBlockHash });

        await this.updateStakingModule(
          updaterState,
          moduleInstance,
          contractModule,
          stakingModuleAddress,
          currNonce,
          currentBlockHash,
        );
        continue;
      }

      if (
        prevElMeta.blockNumber < currElMeta.number &&
        (await moduleInstance.operatorsWereChanged(
          contractModule.stakingModuleAddress,
          prevElMeta.blockNumber + 1,
          currElMeta.number,
        ))
      ) {
        this.logger.log('Update operator events happened, need to update operators', {
          stakingModuleAddress,
          currentBlockHash,
        });

        await this.updateStakingModule(
          updaterState,
          moduleInstance,
          contractModule,
          stakingModuleAddress,
          currNonce,
          currentBlockHash,
        );
        continue;
      }

      this.logger.log('No changes have been detected in the module, indexing is not required', {
        stakingModuleAddress,
        currentBlockHash,
      });
    }

    // Update EL meta in db
    await this.elMetaStorage.update({ ...currElMeta, lastChangedBlockHash: updaterState.lastChangedBlockHash });
  }

  public async updateStakingModule(
    updaterState: UpdaterState,
    moduleInstance: StakingModuleInterface,
    contractModule: StakingModule,
    stakingModuleAddress: string,
    currNonce: number,
    currentBlockHash: string,
  ) {
    await moduleInstance.update(stakingModuleAddress, currentBlockHash);
    await this.srModulesStorage.upsert(contractModule, currNonce, currentBlockHash);
    updaterState.lastChangedBlockHash = currentBlockHash;
  }

  public async isReorgDetected(updaterState: UpdaterState, prevBlockHash: string, currentBlockHash: string) {
    // calculate once per iteration
    // no need to recheck each module separately
    if (updaterState.isReorgDetected) {
      return true;
    }

    const currentBlock = await this.executionProvider.getFullBlock(currentBlockHash);
    const prevBlock = await this.executionProvider.getFullBlock(prevBlockHash);

    if (currentBlock.parentHash === prevBlock.hash) return false;
    // different hash but same number
    if (currentBlock.number === prevBlock.number) {
      updaterState.isReorgDetected = true;
      return true;
    }

    const blocks = await Promise.all(
      range(prevBlock.number, currentBlock.number).map(async (bNumber) => {
        return await this.executionProvider.getFullBlock(bNumber);
      }),
    );

    for (let i = 1; i < blocks.length; i++) {
      const previousBlock = blocks[i - 1];
      const currentBlock = blocks[i];

      if (currentBlock.parentHash !== previousBlock.hash) {
        updaterState.isReorgDetected = true;
        return true;
      }
    }

    return false;
  }

  public isTooMuchDiffBetweenBlocks(prevBlockNumber: number, currentBlockNumber: number) {
    return currentBlockNumber - prevBlockNumber >= MAX_BLOCKS_OVERLAP;
  }

  /**
   * Update prometheus metrics of staking modules
   */
  public async updateMetrics() {
    await this.entityManager.transactional(
      async () => {
        const stakingModules = await this.stakingRouterService.getStakingModules();
        const elMeta = await this.stakingRouterService.getElBlockSnapshot();

        if (!elMeta) {
          this.logger.warn("Meta is null, maybe data hasn't been written in db yet");
          return;
        }

        // update timestamp and block number metrics
        this.prometheusService.registryLastUpdate.set(elMeta.timestamp);
        this.prometheusService.registryBlockNumber.set(elMeta.blockNumber);

        for (const module of stakingModules) {
          const moduleInstance = this.stakingRouterService.getStakingRouterModuleImpl(module.type);

          // update nonce metric
          this.prometheusService.registryNonce.set({ srModuleId: module.id }, module.nonce);

          // get operators
          const operators = await moduleInstance.getOperators(module.stakingModuleAddress);
          this.prometheusService.registryNumberOfKeysBySRModuleAndOperator.reset();

          operators.forEach((operator) => {
            this.prometheusService.registryNumberOfKeysBySRModuleAndOperator.set(
              {
                operator: operator.index,
                srModuleId: module.id,
                used: 'true',
              },
              operator.usedSigningKeys,
            );

            this.prometheusService.registryNumberOfKeysBySRModuleAndOperator.set(
              {
                operator: operator.index,
                srModuleId: module.id,
                used: 'false',
              },
              operator.totalSigningKeys - operator.usedSigningKeys,
            );
          });
        }
      },
      { isolationLevel: IsolationLevel.REPEATABLE_READ },
    );
  }

  private modulesWereDeleted(contractModules: StakingModule[], storageModules: SrModuleEntity[]): boolean {
    // we want to check here that all modules from storageModules exist in list contractModules
    // will check moduleId
    const contractModulesIds = contractModules.map((contractModule) => contractModule.moduleId);

    return !storageModules.every((storageModule) => contractModulesIds.includes(storageModule.moduleId));
  }
}
