import { Inject, Injectable } from '@nestjs/common';
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
import { StakingModule } from 'staking-router-modules/interfaces/staking-module.interface';
import { StakingModuleUpdaterService } from './staking-module-updater.service';

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
    protected readonly stakingModuleUpdaterService: StakingModuleUpdaterService,
  ) {}

  protected lastTimestampSec: number | undefined = undefined;
  protected lastBlockNumber: number | undefined = undefined;

  // Name of interval for updating keys
  public UPDATE_KEYS_JOB_NAME = 'SRModulesKeysUpdate';
  // Timeout for update keys
  // If during 30 minutes nothing happen we will exit
  UPDATE_KEYS_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  updateDeadlineTimer: undefined | NodeJS.Timeout = undefined;

  /**
   * Initializes the job
   */
  public async initialize(): Promise<void> {
    // Set metrics based on the values from the database
    this.updateMetrics();

    // Initially, start the timer to check whether an update has occurred or not
    // If timer isn't cleared in 30 minutes period, we will consider it as nodejs frizzing and exit
    this.checkKeysUpdateTimeout();
    await this.updateKeys().catch((error) => this.logger.error(error));

    const interval_ms = this.configService.get('UPDATE_KEYS_INTERVAL_MS');
    const interval = setInterval(() => this.updateKeys().catch((error) => this.logger.error(error)), interval_ms);
    this.schedulerRegistry.addInterval(this.UPDATE_KEYS_JOB_NAME, interval);

    this.logger.log('Finished KeysUpdateService initialization');
  }

  private checkKeysUpdateTimeout() {
    const currTimestampSec = new Date().getTime() / 1000;
    // currTimestampSec - this.lastTimestampSec - Time since last update in seconds
    // this.UPDATE_KEYS_TIMEOUT_MS / 1000 - timeout in seconds
    // So if time since last update is less than timeout, this means keys are updated
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
    this.logger.log('Fetched latest block');
    // read from database last execution layer data
    const prevElMeta = await this.elMetaStorage.get();

    this.logger.log('Fetched current execution meta and meta from database');

    // handle the situation when the node has fallen behind the service state
    if (prevElMeta && prevElMeta?.blockNumber > currElMeta.number) {
      this.logger.warn('Previous data is newer than current data', prevElMeta);
      return;
    }

    if (prevElMeta?.blockHash && prevElMeta.blockHash === currElMeta.hash) {
      this.logger.log('Same blockHash, updating is not required', { prevElMeta, currElMeta });
      return;
    }

    // Get modules from storage
    const storageModules = await this.srModulesStorage.findAll();

    this.logger.log('Fetched modules from database');

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
        await this.stakingModuleUpdaterService.updateStakingModules({ currElMeta, prevElMeta, contractModules });
      },
      { isolationLevel: IsolationLevel.READ_COMMITTED },
    );

    return currElMeta;
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

        this.prometheusService.registryNumberOfKeysBySRModuleAndOperator.reset();

        for (const stakingModule of stakingModules) {
          const moduleInstance = this.stakingRouterService.getStakingRouterModuleImpl(stakingModule.type);

          // update nonce metric
          this.prometheusService.registryNonce.set({ srModuleId: stakingModule.moduleId }, stakingModule.nonce);

          // get operators
          const operators = await moduleInstance.getOperators(stakingModule.stakingModuleAddress);

          operators.forEach((operator) => {
            this.prometheusService.registryNumberOfKeysBySRModuleAndOperator.set(
              {
                operator: operator.index,
                srModuleId: stakingModule.moduleId,
                used: 'true',
              },
              operator.usedSigningKeys,
            );

            this.prometheusService.registryNumberOfKeysBySRModuleAndOperator.set(
              {
                operator: operator.index,
                srModuleId: stakingModule.moduleId,
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
