import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { LOGGER_PROVIDER, LoggerService } from 'common/logger';
import { ValidatorsUpdateService } from './validators-update/validators-update.service';
import { KeysUpdateService } from './keys-update';

@Injectable()
export class JobsService implements OnModuleInit {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected readonly keysUpdateService: KeysUpdateService,
    protected readonly validatorUpdateService: ValidatorsUpdateService,
  ) {}

  public async onModuleInit(): Promise<void> {
    // Do not wait for initialization to avoid blocking the main process
    this.initialize().catch((err) => this.logger.error(err));
  }

  /**
   * Initializes jobs
   */
  protected async initialize(): Promise<void> {
    await this.keysUpdateService.initialize();

    if (this.validatorUpdateService.disabledRegistry()) {
      this.logger.log('Job for updating validators is disabled');
      return;
    }

    await this.validatorUpdateService.initialize();
  }
}
