import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { GroupedByModuleKeyListResponse, SRModuleKeyListResponse } from './entities';
import { KeyQuery, Key, ELBlockSnapshot, StakingModuleResponse } from '../common/entities';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { StakingRouterService } from '../../staking-router-modules/staking-router.service';
import { EntityManager } from '@mikro-orm/knex';
import { IsolationLevel } from '@mikro-orm/core';
import { SrModuleEntity } from 'storage/sr-module.entity';
import { RegistryKey } from 'common/registry';

@Injectable()
export class SRModulesKeysService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected stakingRouterService: StakingRouterService,
    protected readonly entityManager: EntityManager,
  ) {}

  /**
   * @deprecated Inefficient: reads and returns all keys of all modules at once, fully materialized
   * in memory with no pagination or result bound.
   * The whole read is wrapped in a single REPEATABLE_READ transaction so that the returned keys and the
   * advertised `elBlockSnapshot` come from the same DB snapshot). Prefer the streaming,
   * per-module path {@link getModuleKeys} for new consumers.
   */
  async getGroupedByModuleKeys(filters: KeyQuery): Promise<GroupedByModuleKeyListResponse> {
    const { srModulesKeys, elBlockSnapshot } = await this.entityManager.transactional(
      async () => {
        const {
          stakingModules,
          elBlockSnapshot,
        }: { stakingModules: SrModuleEntity[]; elBlockSnapshot: ELBlockSnapshot } =
          await this.stakingRouterService.getStakingModulesAndMeta();
        const srModulesKeys: { keys: Key[]; module: StakingModuleResponse }[] = [];

        for (const stakingModule of stakingModules) {
          // read from config name of module that implement functions to fetch and store keys for type
          const moduleInstance = this.stakingRouterService.getStakingRouterModuleImpl(stakingModule.type);
          const keys: RegistryKey[] = await moduleInstance.getKeys(stakingModule.stakingModuleAddress, filters);
          const keysResp = keys.map((key) => new Key(key));

          srModulesKeys.push({ keys: keysResp, module: new StakingModuleResponse(stakingModule) });
        }

        return { srModulesKeys, elBlockSnapshot };
      },
      { isolationLevel: IsolationLevel.REPEATABLE_READ },
    );

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
    module: StakingModuleResponse;
    meta: { elBlockSnapshot: ELBlockSnapshot };
  }> {
    const { module, elBlockSnapshot }: { module: SrModuleEntity; elBlockSnapshot: ELBlockSnapshot } =
      await this.stakingRouterService.getStakingModuleAndMeta(moduleId);
    const moduleInstance = this.stakingRouterService.getStakingRouterModuleImpl(module.type);

    const keysGenerator: AsyncGenerator<Key> = await moduleInstance.getKeysStream(module.stakingModuleAddress, filters);

    return { keysGenerator, module: new StakingModuleResponse(module), meta: { elBlockSnapshot } };
  }

  async getModuleKeysByPubKeys(moduleId: string | number, pubKeys: string[]): Promise<SRModuleKeyListResponse> {
    const { keys, module, elBlockSnapshot } = await this.entityManager.transactional(
      async () => {
        const { module, elBlockSnapshot }: { module: SrModuleEntity; elBlockSnapshot: ELBlockSnapshot } =
          await this.stakingRouterService.getStakingModuleAndMeta(moduleId);
        const moduleInstance = this.stakingRouterService.getStakingRouterModuleImpl(module.type);
        const keys: RegistryKey[] = await moduleInstance.getKeysByPubKeys(module.stakingModuleAddress, pubKeys);

        return { keys, module, elBlockSnapshot };
      },
      { isolationLevel: IsolationLevel.REPEATABLE_READ },
    );

    return {
      data: { keys: keys.map((key) => new Key(key)), module: new StakingModuleResponse(module) },
      meta: { elBlockSnapshot },
    };
  }
}
