import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { SRModuleKeyListResponse } from './entities';
import { ModuleId, KeyQuery, Key, ELBlockSnapshot, SRModule } from '../common/entities';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { StakingRouterService } from '../../staking-router-modules/staking-router.service';
import { KeyEntity } from '../../staking-router-modules/interfaces/staking-module.interface';
// TODO: maybe moved it from staking-router-modules/interfaces/filters
// import { KeyField } from 'staking-router-modules/interfaces/filters';
import { EntityManager } from '@mikro-orm/knex';
import { IsolationLevel } from '@mikro-orm/core';

type KeyFieldT = keyof Key;

@Injectable()
export class SRModulesKeysService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected stakingRouterService: StakingRouterService,
    protected readonly entityManager: EntityManager,
  ) {}

  async getGroupedByModuleKeys(filters: KeyQuery): Promise<{
    keysGeneratorsByModules: { keysGenerator: AsyncGenerator<Key>; module: SRModule }[];
    meta: { elBlockSnapshot: ELBlockSnapshot };
  }> {
    const { stakingModules, elBlockSnapshot } = await this.stakingRouterService.getStakingModulesAndMeta();
    const keysGeneratorsByModules: { keysGenerator: any; module: SRModule }[] = [];

    for (const module of stakingModules) {
      const moduleInstance = this.stakingRouterService.getStakingRouterModuleImpl(module.type);
      const fields: KeyFieldT[] = ['key', 'depositSignature', 'operatorIndex', 'used'];
      const keysGenerator: AsyncGenerator<Key> = await moduleInstance.getKeysStream(
        module.stakingModuleAddress,
        filters,
        fields,
      );

      keysGeneratorsByModules.push({ keysGenerator, module: new SRModule(module) });
    }

    return { keysGeneratorsByModules, meta: { elBlockSnapshot } };
  }

  async getModuleKeys(
    moduleId: ModuleId,
    filters: KeyQuery,
  ): Promise<{
    keysGenerator: AsyncGenerator<KeyEntity>;
    module: SRModule;
    meta: { elBlockSnapshot: ELBlockSnapshot };
  }> {
    const { module, elBlockSnapshot } = await this.stakingRouterService.getStakingModuleAndMeta(moduleId);
    const moduleInstance = this.stakingRouterService.getStakingRouterModuleImpl(module.type);

    // TODO: is it okay that in answer we will get moduleAddress two ?
    // before we had
    const keysGenerator: AsyncGenerator<KeyEntity> = await moduleInstance.getKeysStream(
      module.stakingModuleAddress,
      filters,
    );

    return { keysGenerator, module, meta: { elBlockSnapshot } };
  }

  async getModuleKeysByPubKeys(moduleId: ModuleId, pubKeys: string[]): Promise<SRModuleKeyListResponse> {
    const { keys, module, elBlockSnapshot } = await this.entityManager.transactional(
      async () => {
        const { module, elBlockSnapshot } = await this.stakingRouterService.getStakingModuleAndMeta(moduleId);
        const moduleInstance = this.stakingRouterService.getStakingRouterModuleImpl(module.type);
        const keys: KeyEntity[] = await moduleInstance.getKeysByPubKeys(module.stakingModuleAddress, pubKeys);

        return { keys, module, elBlockSnapshot };
      },
      { isolationLevel: IsolationLevel.REPEATABLE_READ },
    );

    return {
      data: { keys, module },
      meta: { elBlockSnapshot },
    };
  }
}
