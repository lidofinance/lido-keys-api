import { RegistryService } from 'jobs/registry.service';
import { ValidatorsRegistryService } from 'jobs/validators-registry.service';
import { ConfigService } from 'common/config';
import { CLBlockSnapshot, ELBlockSnapshot } from 'http/common/entities';
import { APP_VERSION } from 'app/app.constants';
import { Status } from './entities';
import { Injectable } from '@nestjs/common';

@Injectable()
export class StatusService {
  constructor(
    protected readonly registryService: RegistryService,
    protected readonly validatorsRegistryService: ValidatorsRegistryService,
    protected readonly configService: ConfigService,
  ) {}

  public async get(): Promise<Status> {
    const chainId = this.configService.get('CHAIN_ID');

    const registryMeta = await this.registryService.getMetaDataFromStorage();
    const validatorsMeta = await this.validatorsRegistryService.getMetaDataFromStorage();

    return {
      appVersion: APP_VERSION,
      chainId,
      elBlockSnapshot: new ELBlockSnapshot(registryMeta),
      clBlockSnapshot: new CLBlockSnapshot(validatorsMeta),
    };
  }
}
