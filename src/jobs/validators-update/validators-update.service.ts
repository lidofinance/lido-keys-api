import { Inject, Injectable } from '@nestjs/common';
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
  protected lastBlockTimestampSec: number | undefined = undefined;
  protected lastBlockNumber: number | undefined = undefined;
  protected lastSlot: number | undefined = undefined;

  // name of interval for updating validators
  public UPDATE_VALIDATORS_JOB_NAME = 'ValidatorsUpdate';
  // timeout for update validators
  // if during 60 minutes nothing happen we will exit
  UPDATE_VALIDATORS_TIMEOUT_MS = 90 * 60 * 1000;
  updateDeadlineTimer: undefined | NodeJS.Timeout = undefined;

  public isDisabledRegistry() {
    return !this.configService.get('VALIDATOR_REGISTRY_ENABLE');
  }

  public async initialize() {
    // Initially, start a timer to check for updates.
    // If the timer isn't cleared within a 90-minute period, consider it as Node.js freezing and exit.
    this.resetValidatorsUpdateTimeout();
    await this.updateValidators().catch((error) => this.logger.error(error));

    const interval_ms = this.configService.get('UPDATE_VALIDATORS_INTERVAL_MS');
    const interval = setInterval(() => this.updateValidators().catch((error) => this.logger.error(error)), interval_ms);
    this.schedulerRegistry.addInterval(this.UPDATE_VALIDATORS_JOB_NAME, interval);

    this.logger.log('Finished ValidatorsUpdateService initialization');
  }

  private resetValidatorsUpdateTimeout() {
    // TODO: maybe in past the problem was in blocked event loop and instead of this we need to add unblocking function
    if (this.updateDeadlineTimer) clearTimeout(this.updateDeadlineTimer);

    this.updateDeadlineTimer = setTimeout(async () => {
      const error = new ValidatorsOutdatedError(
        `There were no validators update more than ${this.UPDATE_VALIDATORS_TIMEOUT_MS / (60 * 1000)} minutes`,
        this.lastBlockNumber,
      );
      this.logger.error(error);
      process.exit(1);
    }, this.UPDATE_VALIDATORS_TIMEOUT_MS);
  }

  @OneAtTime()
  private async updateValidators() {
    await this.jobService.wrapJob({ name: 'Update validators from ValidatorsRegistry' }, async () => {
      const meta = await this.validatorsService.updateValidators('finalized');
      // meta shouldn't be null
      // if update didnt happen, meta will be fetched from db
      this.lastBlockTimestampSec = meta?.timestamp ?? this.lastBlockTimestampSec;
      this.lastBlockNumber = meta?.blockNumber ?? this.lastBlockNumber;
      this.lastSlot = meta?.slot ?? this.lastSlot;
      this.updateMetrics();

      // Always set a new timer after a successful update.
      // This timeout is needed to restart the node if it's frozen.
      // The actual value of this.lastBlockTimestampSec is irrelevant; what matters is whether we reach this line or not.
      this.resetValidatorsUpdateTimeout();
    });
  }

  private updateMetrics() {
    if (this.lastBlockTimestampSec) {
      this.prometheusService.validatorsRegistryLastTimestampUpdate.set(this.lastBlockTimestampSec);
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
