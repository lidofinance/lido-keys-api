import { CronJob } from 'cron';
import { Inject, Injectable } from '@nestjs/common';
import { OneAtTime } from '@lido-nestjs/decorators';
import { LOGGER_PROVIDER, LoggerService } from 'common/logger';
import { PrometheusService } from 'common/prometheus';
import { ConfigService } from 'common/config';
import { JobService } from 'common/job';
import { StakingRouterFetchService, StakingModule } from 'common/contracts';
import { ExecutionProviderService } from 'common/execution-provider';
import { StakingRouterService } from 'staking-router-modules/';
import { Operator, StakingModuleInterface } from 'staking-router-modules/interfaces';

@Injectable()
export class KeysUpdateService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected readonly prometheusService: PrometheusService,
    protected readonly configService: ConfigService,
    protected readonly jobService: JobService,
    protected readonly stakingRouterFetchService: StakingRouterFetchService,
    protected readonly executionProvider: ExecutionProviderService,
    protected readonly stakingRouterService: StakingRouterService,
  ) {}

  protected lastTimestamp: number | undefined = undefined;
  protected lastBlockNumber: number | undefined = undefined;
  // will store by module id to be the same for all chains
  protected operatorsModuleMap: Record<number, Operator[]> = {};
  // undefined is possible if meta is null
  protected nonceModuleMap: Record<number, number | undefined> = {};

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

  /**
   * Collects updates from the registry contract and saves the changes to the database
   */
  @OneAtTime()
  private async updateKeys(): Promise<void> {
    await this.jobService.wrapJob({ name: 'Update Staking Router Modules keys' }, async () => {
      // get blockHash for 'latest' block
      const blockHash = await this.executionProvider.getBlockHash('latest');
      // get staking router modules from SR contract and assign every module with type known to our tooling
      const modules = await this.stakingRouterFetchService.getStakingModules({ blockHash: blockHash });
      // cache modules
      this.stakingRouterService.setStakingModules(modules);

      // Get modules with tooling
      const stakingModulesTooling = this.stakingRouterService.getStakingModulesTooling();

      // Here should be a transaction in future that will wrap updateKeys calls of all modules
      // or other way to call updateKeys method consistently

      for (const { stakingModule, tooling } of stakingModulesTooling) {
        this.logger.debug?.(
          `Start updating keys of staking module with id ${stakingModule.id} and type ${stakingModule.type}`,
        );
        await tooling.updateKeys(blockHash);
      }

      // Update cached data to quick access
      await this.updateMetricsCache(stakingModulesTooling);

      this.setMetrics(stakingModulesTooling);
    });
  }

  /**
   * Update cache data above
   */
  private async updateMetricsCache(
    stakingModulesTooling: { stakingModule: StakingModule; tooling: StakingModuleInterface }[],
  ) {
    // List of operators with used/unused keys metric possible for every module
    for (const [index, { stakingModule, tooling }] of stakingModulesTooling.entries()) {
      const { operators, meta } = await tooling.getOperatorsWithMeta();

      // TODO: is it write here to use old value if meta is null ?
      // if meta is undefined is means db is empty or something wrong happened
      this.nonceModuleMap[stakingModule.id] = meta?.keysOpIndex; //  ?? this.nonceModuleMap[stakingModule.id];
      this.operatorsModuleMap[stakingModule.id] = operators;

      // Timestamp and block number is common for all modules
      // Will get meta from 0 service
      if (index == 0) {
        this.lastTimestamp = meta?.timestamp; // ?? this.lastTimestamp;
        this.lastBlockNumber = meta?.blockNumber; // ?? this.lastBlockNumber;
      }
    }
  }

  /**
   * Updates prometheus metrics
   */
  private setMetrics(stakingModulesTooling: { stakingModule: StakingModule }[]) {
    // update common metrics
    if (this.lastTimestamp) {
      this.prometheusService.registryLastUpdate.set(this.lastTimestamp);
    }
    if (this.lastBlockNumber) {
      this.prometheusService.registryBlockNumber.set(this.lastBlockNumber);
    }

    // update staking router modules metrics
    for (const { stakingModule } of stakingModulesTooling) {
      const nonce = this.nonceModuleMap[stakingModule.id];
      if (nonce) {
        this.prometheusService.registryNonce.set({ srModuleId: stakingModule.id }, nonce);
      }

      this.setCuratedOperatorsMetric(stakingModule.id);

      this.logger.log(`Staking Module ${stakingModule.id} metrics updated`);
    }
  }

  private setCuratedOperatorsMetric(stakingModuleId: number) {
    this.prometheusService.registryNumberOfKeysBySRModuleAndOperator.reset();

    this.operatorsModuleMap[stakingModuleId].forEach((operator) => {
      // TODO: is it okay use in label operatorIndex ?
      // number of operators can increase, so number of metrics too
      // here it * 2 * stModules.lenth

      this.prometheusService.registryNumberOfKeysBySRModuleAndOperator.set(
        {
          operator: operator.index,
          srModuleId: stakingModuleId,
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
