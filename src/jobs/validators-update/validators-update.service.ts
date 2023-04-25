import { Inject, Injectable } from '@nestjs/common';
// import { OneAtTime } from '@lido-nestjs/decorators';
import { LOGGER_PROVIDER, LoggerService } from 'common/logger';
import { PrometheusService } from 'common/prometheus';
import { ConfigService } from 'common/config';
import { JobService } from 'common/job';
import { ValidatorsService } from 'validators';
import { OneAtTime } from 'common/decorators/oneAtTime';
import { SchedulerRegistry } from '@nestjs/schedule';

export interface ValidatorsFilter {
  pubkeys: string[];
  statuses: string[];
  max_amount: number | undefined;
  percent: number | undefined;
}

class ValidatorsOutdatedError extends Error {
  lastBlock: number;

  constructor(message, lastBlock) {
    super(message);
    this.lastBlock = lastBlock;
  }
}

@Injectable()
export class ValidatorsUpdateService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected readonly prometheusService: PrometheusService,
    protected readonly configService: ConfigService,
    protected readonly jobService: JobService,
    protected readonly validatorsService: ValidatorsService,
    protected readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  // prometheus metrics
  protected lastBlockTimestamp: number | undefined = undefined;
  protected lastBlockNumber: number | undefined = undefined;
  protected lastSlot: number | undefined = undefined;

  // name of interval for updating validators
  public UPDATE_VALIDATORS_INTERVAL = 'ValidatorsUpdate';
  // timeout for update validators
  // if during 30 minutes nothing happen we will exit
  UPDATE_VALIDATORS_TIMEOUT_MS = 30 * 60 * 1000;
  updateTimer: undefined | NodeJS.Timeout = undefined;

  public isDisabledRegistry() {
    return !this.configService.get('VALIDATOR_REGISTRY_ENABLE');
  }

  private checkValidatorsUpdateTimeout() {
    const isUpdated =
      this.lastBlockTimestamp &&
      new Date().getTime() / 1000 - this.lastBlockTimestamp < this.UPDATE_VALIDATORS_TIMEOUT_MS / 1000;

    if (this.updateTimer && isUpdated) clearTimeout(this.updateTimer);

    this.updateTimer = setTimeout(async () => {
      const error = new ValidatorsOutdatedError(
        `There were no validators update more than ${this.UPDATE_VALIDATORS_TIMEOUT_MS / (60 * 1000)} minutes`,
        this.lastBlockNumber,
      );
      this.logger.error(error);
      process.exit(1);
    }, this.UPDATE_VALIDATORS_TIMEOUT_MS);
  }

  public async initialize() {
    await this.updateValidators().catch((error) => this.logger.error(error));
    this.checkValidatorsUpdateTimeout();

    const interval_ms = this.configService.get('UPDATE_VALIDATORS_INTERVAL_MS');
    const interval = setInterval(() => this.updateValidators().catch((error) => this.logger.error(error)), interval_ms);
    this.schedulerRegistry.addInterval(this.UPDATE_VALIDATORS_INTERVAL, interval);

    this.logger.log('Finished ValidatorsUpdateService initialization');
  }

  @OneAtTime()
  private async updateValidators() {
    await this.jobService.wrapJob({ name: 'Update validators from ValidatorsRegistry' }, async () => {
      const meta = await this.validatorsService.updateValidators('finalized');
      // meta shouldnt be null
      // if update didnt happen, meta will be fetched from db
      this.lastBlockTimestamp = meta?.timestamp ?? this.lastBlockTimestamp;
      this.lastBlockNumber = meta?.blockNumber ?? this.lastBlockNumber;
      this.lastSlot = meta?.slot ?? this.lastSlot;
      this.updateMetrics();

      this.checkValidatorsUpdateTimeout();
    });
  }

  private updateMetrics() {
    if (this.lastBlockTimestamp) {
      this.prometheusService.validatorsRegistryLastTimestampUpdate.set(this.lastBlockTimestamp);
    }

    if (this.lastBlockNumber) {
      this.prometheusService.validatorsRegistryLastBlockNumber.set(this.lastBlockNumber);
    }
    if (this.lastSlot) {
      this.prometheusService.validatorsRegistryLastSlot.set(this.lastSlot);
    }

    this.logger.log('ValidatorsRegistry metrics updated');
  }
}
