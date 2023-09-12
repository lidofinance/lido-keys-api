import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from 'common/config';
import { GroupedByModuleKeyListResponse, SRModuleKeyListResponse } from './entities';
import { ModuleId, KeyQuery, Key, ELBlockSnapshot, SRModule } from 'http/common/entities';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { StakingRouterService } from 'staking-router-modules/staking-router.service';
import { EntityManager } from '@mikro-orm/knex';
import { IsolationLevel } from '@mikro-orm/core';

@Injectable()
export class SRModulesKeysService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected configService: ConfigService,
    protected stakingRouterService: StakingRouterService,
    protected readonly entityManager: EntityManager,
  ) {}

  async getGroupedByModuleKeys(filters: KeyQuery): Promise<GroupedByModuleKeyListResponse> {
    const { stakingModules, elBlockSnapshot } = await this.stakingRouterService.getStakingModulesAndMeta();
    const srModulesKeys: { keys: Key[]; module: SRModule }[] = [];

    for (const module of stakingModules) {
      // read from config name of module that implement functions to fetch and store keys for type
      const moduleInstance = this.stakingRouterService.getStakingRouterModuleImpl(module.type);
      const keys: Key[] = await moduleInstance.getKeys(module.stakingModuleAddress, filters);

      srModulesKeys.push({ keys, module: new SRModule(module) });
    }

    return {
      data: srModulesKeys,
      meta: {
        elBlockSnapshot,
      },
    };
  }

  async getModuleKeys(
    moduleId: string | number,
    filters: KeyQuery,
  ): Promise<{
    keysGenerator: AsyncGenerator<Key>;
    module: SRModule;
    meta: { elBlockSnapshot: ELBlockSnapshot };
  }> {
    const { module, elBlockSnapshot } = await this.stakingRouterService.getStakingModuleAndMeta(moduleId);
    const moduleInstance = this.stakingRouterService.getStakingRouterModuleImpl(module.type);

    const keysGenerator: AsyncGenerator<Key> = await moduleInstance.getKeysStream(module.stakingModuleAddress, filters);

    return { keysGenerator, module, meta: { elBlockSnapshot } };
  }

  async getModuleKeysByPubKeys(moduleId: string | number, pubKeys: string[]): Promise<SRModuleKeyListResponse> {
    const { keys, module, elBlockSnapshot } = await this.entityManager.transactional(
      async () => {
        const { module, elBlockSnapshot } = await this.stakingRouterService.getStakingModuleAndMeta(moduleId);
        const moduleInstance = this.stakingRouterService.getStakingRouterModuleImpl(module.type);
        const keys: Key[] = await moduleInstance.getKeysByPubKeys(module.stakingModuleAddress, pubKeys);

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
