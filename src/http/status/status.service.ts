import { ConfigService } from 'common/config';
import { CLBlockSnapshot, ELBlockSnapshot } from 'http/common/entities';
import { APP_VERSION } from 'app/app.constants';
import { Status } from './entities';
import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { CuratedModuleService } from 'staking-router-modules';
import { ValidatorsService } from 'validators';

@Injectable()
export class StatusService {
  constructor(
    protected readonly curatedService: CuratedModuleService,
    protected readonly validatorsService: ValidatorsService,
    protected readonly configService: ConfigService,
    private readonly entityManager: EntityManager,
  ) {}

  public async get(): Promise<Status> {
    const chainId = this.configService.get('CHAIN_ID');

    const { registryMeta, validatorsMeta } = await this.entityManager.transactional(async () => {
      const registryMeta = await this.curatedService.getMetaDataFromStorage();
      const validatorsMeta = await this.validatorsService.getMetaDataFromStorage();

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
