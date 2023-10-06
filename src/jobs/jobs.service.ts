import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { LOGGER_PROVIDER, LoggerService } from 'common/logger';
import { ValidatorsUpdateService } from './validators-update/validators-update.service';
import { KeysUpdateService } from './keys-update';
import { SchedulerRegistry } from '@nestjs/schedule';
import { PrometheusService } from 'common/prometheus';

@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected readonly keysUpdateService: KeysUpdateService,
    protected readonly validatorUpdateService: ValidatorsUpdateService,
    protected readonly schedulerRegistry: SchedulerRegistry,
    protected readonly prometheusService: PrometheusService,
  ) {}

  public async onModuleInit(): Promise<void> {
    // Do not wait for initialization to avoid blocking the main process
    this.initialize().catch((err) => this.logger.error(err));
  }

  public async onModuleDestroy() {
    console.log('Jobs Service on module destroy');
    try {
      const intervalUpdateKeys = this.schedulerRegistry.getInterval(this.keysUpdateService.UPDATE_KEYS_JOB_NAME);
      clearInterval(intervalUpdateKeys);
      const intervalUpdateValidators = this.schedulerRegistry.getInterval(
        this.validatorUpdateService.UPDATE_VALIDATORS_JOB_NAME,
      );
      clearInterval(intervalUpdateValidators);
    } catch {}
  }

  /**
   * Initializes jobs
   */
  protected async initialize(): Promise<void> {
    // await this.keysUpdateService.initialize();
    if (this.validatorUpdateService.isDisabledRegistry()) {
      this.prometheusService.validatorsEnabled.set(0);
      this.logger.log('Job for updating validators is disabled');
      return;
    }
    this.prometheusService.validatorsEnabled.set(1);
    await this.validatorUpdateService.initialize();
  }
}
