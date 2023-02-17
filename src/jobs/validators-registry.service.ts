import { CronJob } from 'cron';
import { Inject, Injectable } from '@nestjs/common';
import { OneAtTime } from '@lido-nestjs/decorators';
import {
  ValidatorsRegistryInterface,
  ConsensusValidatorsAndMetadata,
  Validator,
  ConsensusMeta,
} from '@lido-nestjs/validators-registry';
import { LOGGER_PROVIDER, LoggerService } from 'common/logger';
import { PrometheusService } from 'common/prometheus';
import { ConfigService } from 'common/config';
import { JobService } from 'common/job';
import { QueryOrder } from '@mikro-orm/core';

export interface ValidatorsFilter {
  pubkeys: string[];
  statuses: string[];
  max_amount: number | undefined;
  percent: number | undefined;
}

@Injectable()
export class ValidatorsRegistryService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected readonly validatorsRegistry: ValidatorsRegistryInterface,
    protected readonly prometheusService: PrometheusService,
    protected readonly configService: ConfigService,
    protected readonly jobService: JobService,
  ) {}

  public async onModuleInit(): Promise<void> {
    // Do not wait for initialization to avoid blocking the main process
    this.initialize().catch((err) => this.logger.error(err));
  }

  private async initialize() {
    await this.updateValidators();

    const cronTime = this.configService.get('JOB_INTERVAL_VALIDATORS_REGISTRY');
    const job = new CronJob(cronTime, () => this.updateValidators());
    job.start();

    this.logger.log('Service initialized', { service: 'validators-registry', cronTime });
  }

  @OneAtTime()
  private async updateValidators() {
    await this.jobService.wrapJob({ name: 'Update validators from ValidatorsRegistry' }, async () => {
      const meta = await this.validatorsRegistry.update('finalized');
      // meta shouldnt be null
      // if update didnt happen, meta will be fetched from db
      this.lastBlockTimestamp = meta.timestamp ?? this.lastBlockTimestamp;
      this.lastBlockNumber = meta.blockNumber ?? this.lastBlockNumber;
      this.lastSlot = meta.slot ?? this.lastSlot;
      this.updateMetrics();
    });
  }

  protected lastBlockTimestamp: number | undefined = undefined;
  protected lastBlockNumber: number | undefined = undefined;
  protected lastSlot: number | undefined = undefined;

  /**
   *
   * @param filter Filters to get from validators database keys
   */
  public async getOldestValidators(filter: ValidatorsFilter): Promise<ConsensusValidatorsAndMetadata> {
    // we suppose in this function at least percent is set
    // should we move setting a default percent in this function ?
    const where = {
      status: { $in: filter.statuses },
    };

    const options = {
      orderBy: { index: QueryOrder.ASC },
    };

    const { validators, meta } = await this.validatorsRegistry.getValidators(filter.pubkeys, where, options);

    // the lower the index, the older the validator
    // if percent is provided, we will get percent oldest validators from db
    if (filter.percent) {
      return { validators: this.getPercentOfValidators(validators, filter.percent), meta };
    }

    if (filter.max_amount) {
      const nextValidatorsToExit = validators.slice(0, filter.max_amount);
      return { validators: nextValidatorsToExit, meta };
    }

    return { validators, meta };
  }

  public async getMetaDataFromStorage(): Promise<ConsensusMeta | null> {
    return this.validatorsRegistry.getMeta();
  }

  private getPercentOfValidators(validators: Validator[], percent: number): Validator[] {
    // Does this round method suit to us?
    const amount = Math.round((validators.length * percent) / 100);
    return validators.slice(0, amount);
  }

  private updateMetrics() {
    this.lastBlockTimestamp &&
      this.prometheusService.validatorsRegistryLastTimestampUpdate.set(this.lastBlockTimestamp);
    this.lastBlockNumber && this.prometheusService.validatorsRegistryLastBlockNumber.set(this.lastBlockNumber);
    this.lastSlot && this.prometheusService.validatorsRegistryLastSlot.set(this.lastSlot);

    this.logger.log('ValidatorsRegistry metrics updated');
  }
}
