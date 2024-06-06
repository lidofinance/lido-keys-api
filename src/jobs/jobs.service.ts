import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { LOGGER_PROVIDER, LoggerService } from 'common/logger';
import { NetworkValidationService } from '../network-validation';
import { ValidatorsUpdateService } from './validators-update/validators-update.service';
import { KeysUpdateService } from './keys-update';
import { SchedulerRegistry } from '@nestjs/schedule';
import { PrometheusService } from 'common/prometheus';

@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected readonly networkValidationService: NetworkValidationService,
    protected readonly keysUpdateService: KeysUpdateService,
    protected readonly validatorUpdateService: ValidatorsUpdateService,
    protected readonly schedulerRegistry: SchedulerRegistry,
    protected readonly prometheusService: PrometheusService,
  ) {}

  public async onModuleInit(): Promise<void> {
    this.logger.log('Started network config and DB validation');
    await this.networkValidationService.validate();
    this.logger.log('Finished network config and DB validation');

    // Do not wait for initialization to avoid blocking the main process
    this.initialize().catch((err) => this.logger.error(err));
  }

  public async onModuleDestroy() {
    this.logger.log('Jobs Service on module destroy');
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
    await this.keysUpdateService.initialize();
    if (this.validatorUpdateService.isDisabledRegistry()) {
      this.prometheusService.validatorsEnabled.set(0);
      this.logger.log('Job for updating validators is disabled');
      return;
    }
    this.prometheusService.validatorsEnabled.set(1);
    await this.validatorUpdateService.initialize();
  }
}
