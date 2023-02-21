import { RegistryService } from 'jobs/registry/registry.service';
import { ValidatorsRegistryService } from 'jobs/validators-registry/validators-registry.service';
import { ConfigService } from 'common/config';
import { CLBlockSnapshot, ELBlockSnapshot } from 'http/common/entities';
import { APP_VERSION } from 'app/app.constants';
import { Status } from './entities';
import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';

@Injectable()
export class StatusService {
  constructor(
    protected readonly registryService: RegistryService,
    protected readonly validatorsRegistryService: ValidatorsRegistryService,
    protected readonly configService: ConfigService,
    private readonly entityManager: EntityManager,
  ) {}

  public async get(): Promise<Status> {
    const chainId = this.configService.get('CHAIN_ID');

    const { registryMeta, validatorsMeta } = await this.entityManager.transactional(async () => {
      const registryMeta = await this.registryService.getMetaDataFromStorage();
      const validatorsMeta = await this.validatorsRegistryService.getMetaDataFromStorage();

      return { registryMeta, validatorsMeta };
    });

    const elBlockSnapshot = registryMeta ? new ELBlockSnapshot(registryMeta) : null;
    const clBlockSnapshot = validatorsMeta ? new CLBlockSnapshot(validatorsMeta) : null;

    return {
      appVersion: APP_VERSION,
      chainId,
      elBlockSnapshot,
      clBlockSnapshot,
    };
  }
}
