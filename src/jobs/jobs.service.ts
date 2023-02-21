import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { LOGGER_PROVIDER, LoggerService } from 'common/logger';
import { ValidatorsRegistryService } from './validators-registry/validators-registry.service';
import { RegistryService } from './registry/registry.service';

@Injectable()
export class JobsService implements OnModuleInit {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected readonly registryService: RegistryService,
    protected readonly validatorRegistryService: ValidatorsRegistryService,
  ) {}

  public async onModuleInit(): Promise<void> {
    // Do not wait for initialization to avoid blocking the main process
    this.initialize().catch((err) => this.logger.error(err));
  }

  /**
   * Initializes jobs
   */
  protected async initialize(): Promise<void> {
    await this.registryService.initialize();

    if (this.validatorRegistryService.disabledRegistry()) {
      this.logger.log('Job for updating validators is disabled');
      return;
    }

    await this.validatorRegistryService.initialize();
  }
}
