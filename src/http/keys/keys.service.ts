import { Inject, Injectable, LoggerService, NotFoundException } from '@nestjs/common';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { KeyListResponse } from './entities';
import { StakingRouterService } from '../../staking-router-modules/staking-router.service';
import { ELBlockSnapshot, Key, KeyQuery } from '../common/entities';
import { IsolationLevel } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/knex';
import { RegistryKey } from 'common/registry';

@Injectable()
export class KeysService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected stakingRouterService: StakingRouterService,
    protected readonly entityManager: EntityManager,
  ) {}

  async get(
    filters: KeyQuery,
  ): Promise<{ keysGenerators: AsyncGenerator<Key>[]; meta: { elBlockSnapshot: ELBlockSnapshot } }> {
    const { stakingModules, elBlockSnapshot } = await this.stakingRouterService.getStakingModulesAndMeta();
    const keysGenerators: AsyncGenerator<Key>[] = [];

    for (const module of stakingModules) {
      const moduleInstance = this.stakingRouterService.getStakingRouterModuleImpl(module.type);
      const keysGenerator: AsyncGenerator<Key> = await moduleInstance.getKeysStream(
        module.stakingModuleAddress,
        filters,
      );

      keysGenerators.push(keysGenerator);
    }

    return {
      keysGenerators,
      meta: { elBlockSnapshot },
    };
  }

  async getByPubkey(pubkey: string): Promise<KeyListResponse> {
    const { keys, elBlockSnapshot } = await this.entityManager.transactional(
      async () => {
        const { stakingModules, elBlockSnapshot } = await this.stakingRouterService.getStakingModulesAndMeta();
        const collectedKeys: Key[][] = [];

        for (const module of stakingModules) {
          const moduleInstance = this.stakingRouterService.getStakingRouterModuleImpl(module.type);
          const keys: RegistryKey[] = await moduleInstance.getKeysByPubkey(module.stakingModuleAddress, pubkey);
          const keysResp = keys.map((key) => new Key(key));
          collectedKeys.push(keysResp);
        }

        return { keys: collectedKeys.flat(), elBlockSnapshot };
      },
      { isolationLevel: IsolationLevel.REPEATABLE_READ },
    );

    if (keys.length == 0) {
      throw new NotFoundException(`There are no keys with ${pubkey} public key in db.`);
    }

    return {
      data: keys,
      meta: { elBlockSnapshot },
    };
  }

  async getByPubkeys(pubKeys: string[]): Promise<KeyListResponse> {
    const { keys, elBlockSnapshot } = await this.entityManager.transactional(
      async () => {
        const { stakingModules, elBlockSnapshot } = await this.stakingRouterService.getStakingModulesAndMeta();
        const collectedKeys: Key[][] = [];

        for (const module of stakingModules) {
          const moduleInstance = this.stakingRouterService.getStakingRouterModuleImpl(module.type);
          const keys: RegistryKey[] = await moduleInstance.getKeysByPubKeys(module.stakingModuleAddress, pubKeys);
          const keysResp = keys.map((key) => new Key(key));
          collectedKeys.push(keysResp);
        }

        return { keys: collectedKeys.flat(), elBlockSnapshot };
      },
      { isolationLevel: IsolationLevel.REPEATABLE_READ },
    );

    return {
      data: keys,
      meta: { elBlockSnapshot },
    };
  }
}
