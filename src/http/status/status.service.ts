import { ConfigService } from 'common/config';
import { CLBlockSnapshot, ELBlockSnapshot } from 'http/common/entities';
import { APP_VERSION } from 'app/app.constants';
import { Status } from './entities';
import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { ValidatorsService } from 'validators';
import { IsolationLevel } from '@mikro-orm/core';
import { StakingRouterService } from 'staking-router-modules/staking-router.service';

@Injectable()
export class StatusService {
  constructor(
    protected readonly validatorsService: ValidatorsService,
    protected readonly configService: ConfigService,
    private readonly entityManager: EntityManager,
    private readonly stakingRouterService: StakingRouterService,
  ) {}

  public async get(): Promise<Status> {
    const chainId = this.configService.get('CHAIN_ID');

    // TODO: maybe move this code to sr-modules-service
    const { elMeta, clMeta } = await this.entityManager.transactional(
      async () => {
        const elMeta = await this.stakingRouterService.getElBlockSnapshot();
        const clMeta = await this.validatorsService.getMetaDataFromStorage();

        return { elMeta, clMeta };
      },
      { isolationLevel: IsolationLevel.REPEATABLE_READ },
    );

    const elBlockSnapshot = elMeta ? new ELBlockSnapshot(elMeta) : null;
    const clBlockSnapshot = clMeta ? new CLBlockSnapshot(clMeta) : null;

    return {
      appVersion: APP_VERSION,
      chainId,
      elBlockSnapshot,
      clBlockSnapshot,
    };
  }
}
