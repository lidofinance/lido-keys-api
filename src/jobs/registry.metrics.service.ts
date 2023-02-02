import { CronJob } from 'cron';
import { Inject, Injectable } from '@nestjs/common';
import { OneAtTime } from '@lido-nestjs/decorators';
import { RegistryKey } from '@lido-nestjs/registry';
import { LOGGER_PROVIDER, LoggerService } from 'common/logger';
import { PrometheusService } from 'common/prometheus';
import { EntityManager } from '@mikro-orm/postgresql';
import { ConfigService } from 'common/config';
import { JobService } from 'common/job';

@Injectable()
export class RegistryMetricsService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    private readonly entityManager: EntityManager,
    protected readonly prometheusService: PrometheusService,
    protected readonly configService: ConfigService,
    protected readonly jobService: JobService,
  ) {}

  public async onModuleInit(): Promise<void> {
    await this.initialize().catch((err) => this.logger.error(err));
  }

  /**
   * Initializes the job
   */
  public async initialize(): Promise<void> {
    await this.updateRegistryKeysOperatorMetric();

    const cronTime = this.configService.get('JOB_INTERVAL_REGISTRY_KEYS_OPERATOR_METRIC');
    const job = new CronJob(cronTime, () => this.updateRegistryKeysOperatorMetric());
    job.start();

    this.logger.log('Service initialized', { service: 'registry-metrics', cronTime });
  }

  @OneAtTime()
  private async updateRegistryKeysOperatorMetric() {
    await this.jobService.wrapJob({ name: 'Update keys amount metric' }, async () => {
      const keysAmountByOperator = await this.registryKeysAmountByOperatorIndex();

      keysAmountByOperator.forEach(({ operatorIndex, count, used }) => {
        this.prometheusService.registryNumberOfKeysBySRModuleAndOperator.set(
          {
            operator: operatorIndex,
            srModuleId: 1,
            used: Number(used),
          },
          Number(count),
        );
      });
    });
  }

  private async registryKeysAmountByOperatorIndex(): Promise<
    { operatorIndex: number; used: boolean; count: number }[]
  > {
    const keysAmountByOperator: { operatorIndex: number; used: boolean; count: number }[] = await this.entityManager
      .getRepository(RegistryKey)
      .createQueryBuilder('k')
      .select(['operatorIndex', 'used', 'count(*)'])
      .groupBy(['operatorIndex', 'used'])
      .execute();

    return keysAmountByOperator;
  }
}
