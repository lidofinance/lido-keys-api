import { CronJob } from 'cron';
import { Inject, Injectable } from '@nestjs/common';
import { OneAtTime } from '@lido-nestjs/decorators';
import { LOGGER_PROVIDER, LoggerService } from 'common/logger';
import { PrometheusService } from 'common/prometheus';
import { ConfigService } from 'common/config';
import { JobService } from 'common/job';
import { CuratedModuleService, STAKING_MODULE_TYPE } from '../../staking-router-modules/';
import { RegistryOperator, RegistryMeta } from '@lido-nestjs/registry';
import { StakingRouterFetchService, StakingModule } from 'common/contracts';
import { ExecutionProviderService } from 'common/execution-provider';
import { ModuleId } from 'http/common/entities';

@Injectable()
export class KeysUpdateService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected readonly prometheusService: PrometheusService,
    protected readonly configService: ConfigService,
    protected readonly jobService: JobService,
    protected readonly curatedModuleService: CuratedModuleService,
    protected readonly stakingRouterFetchService: StakingRouterFetchService,
    protected readonly executionProvider: ExecutionProviderService,
  ) {}

  protected lastTimestamp: number | undefined = undefined;
  protected lastBlockNumber: number | undefined = undefined;
  protected curatedNonce: number | undefined = undefined;
  protected curatedOperators: RegistryOperator[] = [];
  protected stakingModules: StakingModule[] = [];

  /**
   * Initializes the job
   */
  public async initialize(): Promise<void> {
    await this.updateKeys();
    const cronTime = this.configService.get('JOB_INTERVAL_REGISTRY');
    const job = new CronJob(cronTime, () => this.updateKeys());
    job.start();

    this.logger.log('Update Staking Router Modules keys', { service: 'keys-registry', cronTime });
  }

  public getStakingModules() {
    return this.stakingModules;
  }

  public getStakingModule(moduleId: ModuleId): StakingModule | undefined {
    return this.stakingModules.find((module) => module.stakingModuleAddress == moduleId || module.id == moduleId);
  }

  /**
   * Collects updates from the registry contract and saves the changes to the database
   */
  @OneAtTime()
  private async updateKeys(): Promise<void> {
    await this.jobService.wrapJob({ name: 'Update Staking Router Modules keys' }, async () => {
      // get blockHash for 'latest' block

      const blockHash = await this.executionProvider.getBlockHash('latest');

      // get staking router modules
      const modules = await this.stakingRouterFetchService.getStakingModules(blockHash);
      this.stakingModules = modules;

      // Here should be a transaction in future that will wrap updateKeys calls of all modules
      // or other way to call updateKeys method consistently

      await Promise.all(
        this.stakingModules.map(async (stakingModule) => {
          if (stakingModule.type === STAKING_MODULE_TYPE.CURATED_ONCHAIN_V1_TYPE) {
            this.logger.debug?.('start updating curated keys');
            await this.curatedModuleService.updateKeys(blockHash);
          }
        }),
      );

      // Update cached data to quick access
      await this.updateMetricsCache();

      this.setMetrics();
    });
  }

  /**
   * Update cache data above
   */
  private async updateMetricsCache() {
    const meta = await this.updateCuratedMetricsCache();
    // update meta
    // timestamp and block number is common for all modules
    this.lastTimestamp = meta?.timestamp ?? this.lastTimestamp;
    this.lastBlockNumber = meta?.blockNumber ?? this.lastBlockNumber;
  }

  private async updateCuratedMetricsCache(): Promise<RegistryMeta | null> {
    const { operators, meta } = await this.curatedModuleService.getOperatorsWithMeta();
    // should set for each module
    this.curatedNonce = meta?.keysOpIndex ?? this.curatedNonce;
    // update curated module operators map
    this.curatedOperators = operators;

    return meta;
  }

  /**
   * Updates prometheus metrics
   */
  private setMetrics() {
    // common metrics
    if (this.lastTimestamp) {
      this.prometheusService.registryLastUpdate.set(this.lastTimestamp);
    }
    if (this.lastBlockNumber) {
      this.prometheusService.registryBlockNumber.set(this.lastBlockNumber);
    }

    // curated metrics
    this.setCuratedMetrics();
  }

  private setCuratedMetrics() {
    if (this.curatedNonce) {
      this.prometheusService.registryNonce.set({ srModuleId: 1 }, this.curatedNonce);
    }
    this.setCuratedOperatorsMetric();

    this.logger.log('Curated Module metrics updated');
  }

  private setCuratedOperatorsMetric() {
    this.prometheusService.registryNumberOfKeysBySRModuleAndOperator.reset();

    this.curatedOperators.forEach((operator) => {
      this.prometheusService.registryNumberOfKeysBySRModuleAndOperator.set(
        {
          operator: operator.index,
          srModuleId: 1,
          used: 'true',
        },
        operator.usedSigningKeys,
      );

      this.prometheusService.registryNumberOfKeysBySRModuleAndOperator.set(
        {
          operator: operator.index,
          srModuleId: 1,
          used: 'false',
        },
        operator.totalSigningKeys - operator.usedSigningKeys,
      );
    });
  }
}
