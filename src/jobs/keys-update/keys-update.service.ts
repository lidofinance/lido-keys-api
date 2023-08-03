import { Inject, Injectable } from '@nestjs/common';
import { LOGGER_PROVIDER, LoggerService } from 'common/logger';
import { ConfigService } from 'common/config';
import { JobService } from 'common/job';
import { OneAtTime } from 'common/decorators/oneAtTime';
import { SchedulerRegistry } from '@nestjs/schedule';
import { StakingRouterService } from 'staking-router-modules/staking-router.service';

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
      const meta = await this.stakingRouterService.update();
      await this.stakingRouterService.updateMetrics();

      if (meta) {
        this.lastBlockNumber = meta.number;
        this.lastTimestampSec = meta.timestamp;
      }

      // clear timeout
      this.checkKeysUpdateTimeout();
    });
  }
}
