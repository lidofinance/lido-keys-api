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

    if (prevElMeta && prevElMeta?.blockNumber > currElMeta.number) {
      this.logger.warn('Previous data is newer than current data', prevElMeta);
      return;
    }

    // TODO: еcли была реорганизация, может ли currElMeta.number быть меньше и нам надо обновиться ?

    const storageModules = await this.srModulesStorage.findAll();
    // get staking router modules from SR contract
    const modules = await this.stakingRouterFetchService.getStakingModules({ blockHash: currElMeta.hash });

    if (this.modulesWereDeleted(modules, storageModules)) {
      const error = new Error('Modules list is wrong');
      this.logger.error(error);
      process.exit(1);
    }

    await this.entityManager.transactional(
      async () => {
        // Update el meta in db
        await this.elMetaStorage.update(currElMeta);

        for (const module of modules) {
          const moduleInstance = this.stakingRouterService.getStakingRouterModuleImpl(module.type);

          // At the moment, let's assume that it is possible to make decisions for all modules based on the nonce value
          const currNonce = await moduleInstance.getCurrentNonce(module.stakingModuleAddress, currElMeta.hash);
          const moduleInStorage = await this.srModulesStorage.findOneById(module.id);
          // update staking module information
          await this.srModulesStorage.upsert(module, currNonce);

          // now updating decision should be here moduleInstance.update
          // TODO: operators list also the same ?
          if (moduleInStorage && moduleInStorage.nonce === currNonce) {
            // nothing changed, don't need to update
            this.logger.log(
              `Nonce was not changed for staking module ${moduleInStorage.id}. Don't need to update keys and operators in database`,
            );
            return;
          }

          await moduleInstance.update(module.stakingModuleAddress, currElMeta.hash);
        }
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
    // will check contractAddress
    const addresses = contractModules.map((module) => module.stakingModuleAddress);

    return !storageModules.every((module) => addresses.includes(module.stakingModuleAddress));
  }
}
