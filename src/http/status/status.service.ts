import { ConfigService } from 'common/config';
import { CLBlockSnapshot, ELBlockSnapshot } from 'http/common/response-entities';
import { APP_VERSION } from 'app/app.constants';
import { Status } from './entities';
import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { StakingRouterService, Meta } from 'staking-router-modules';
import { ValidatorsService } from 'validators';

@Injectable()
export class StatusService {
  constructor(
    protected readonly stakingRouterService: StakingRouterService,
    protected readonly validatorsService: ValidatorsService,
    protected readonly configService: ConfigService,
    private readonly entityManager: EntityManager,
  ) {}

  public async get(): Promise<Status> {
    const chainId = this.configService.get('CHAIN_ID');

    const mainStakingModule = this.stakingRouterService.mainStakingModule();

    // put here main = undefined and check what will happen

    const { registryMeta, validatorsMeta } = await this.entityManager.transactional(async () => {
      let registryMeta: null | Meta = null;

      if (mainStakingModule) {
        registryMeta = await mainStakingModule?.tooling.getMetaDataFromStorage();
      }

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
