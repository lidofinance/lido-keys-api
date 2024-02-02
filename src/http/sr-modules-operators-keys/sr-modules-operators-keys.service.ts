import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ELBlockSnapshot, Key, Operator, StakingModuleResponse } from '../common/entities';
import { KeyQuery } from '../common/entities';

import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { StakingRouterService } from 'staking-router-modules/staking-router.service';
import { EntityManager } from '@mikro-orm/knex';
import { MetaStreamRecord, ModulesOperatorsKeysRecord } from './sr-modules-operators-keys.types';
import { SrModuleEntity } from 'storage/sr-module.entity';
import { RegistryOperator } from '../../common/registry';

@Injectable()
export class SRModulesOperatorsKeysService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected readonly stakingRouterService: StakingRouterService,
    protected readonly entityManager: EntityManager,
  ) {}

  public async get(
    moduleId: string | number,
    filters: KeyQuery,
  ): Promise<{
    keysGenerator: AsyncGenerator<Key>;
    operators: Operator[];
    module: StakingModuleResponse;
    meta: { elBlockSnapshot: ELBlockSnapshot };
  }> {
    const { module, elBlockSnapshot }: { module: SrModuleEntity; elBlockSnapshot: ELBlockSnapshot } =
      await this.stakingRouterService.getStakingModuleAndMeta(moduleId);

    const moduleInstance = this.stakingRouterService.getStakingRouterModuleImpl(module.type);

    const keysGenerator: AsyncGenerator<Key> = moduleInstance.getKeysStream(module.stakingModuleAddress, filters);
    const operatorsFilter = {};

    if (filters.operatorIndex != undefined) {
      operatorsFilter['index'] = filters.operatorIndex;
    }
    const operators: RegistryOperator[] = await moduleInstance.getOperators(
      module.stakingModuleAddress,
      operatorsFilter,
    );

    const operatorsResp = operators.map((op) => new Operator(op));

    return {
      operators: operatorsResp,
      keysGenerator,
      module: new StakingModuleResponse(module),
      meta: { elBlockSnapshot },
    };
  }

  public async *getModulesOperatorsKeysGenerator(): AsyncGenerator<ModulesOperatorsKeysRecord> {
    const { stakingModules, elBlockSnapshot } = await this.stakingRouterService.getStakingModulesAndMeta();

    const meta: MetaStreamRecord = { elBlockSnapshot };
    let metaHasSent = false;
    for (const stakingModule of stakingModules) {
      const moduleInstance = this.stakingRouterService.getStakingRouterModuleImpl(stakingModule.type);

      // const keysGenerator = moduleInstance.getKeysStream(stakingModule.stakingModuleAddress, {});
      // const operatorsGenerator = moduleInstance.getOperatorsStream(stakingModule.stakingModuleAddress, {});

      // let nextKey = await keysGenerator.next();
      // let nextOperator = await operatorsGenerator.next();

      yield {
        stakingModule: new StakingModuleResponse(stakingModule),
        meta: !metaHasSent ? meta : null,
        key: null, //!nextKey.value ? null : new Key(nextKey.value),
        operator: null, //!nextOperator.value ? null : new Operator(nextOperator.value),
      };

      metaHasSent = true;

      const keysGenerator = moduleInstance.getKeysStream(stakingModule.stakingModuleAddress, {});
      let nextKey = await keysGenerator.next();
      while (!nextKey.done) {
        // Yield all keys first
        yield {
          stakingModule: null, // Already yielded above
          meta: null, // Already yielded above
          key: nextKey.value ? new Key(nextKey.value) : null,
          operator: null,
        };
        nextKey = await keysGenerator.next();
      }

      const operatorsGenerator = moduleInstance.getOperatorsStream(stakingModule.stakingModuleAddress, {});
      let nextOperator = await operatorsGenerator.next();
      while (!nextOperator.done) {
        // After all keys, yield all operators
        yield {
          stakingModule: null, // Already yielded above
          meta: null, // Already yielded above
          key: null,
          operator: nextOperator.value ? new Operator(nextOperator.value) : null,
        };
        nextOperator = await operatorsGenerator.next();
      }

      // do {
      //   if (!nextKey.done) {
      //     nextKey = await keysGenerator.next();
      //   }

      //   if (!nextOperator.done) {
      //     nextOperator = await operatorsGenerator.next();
      //   }

      //   if (!nextKey.value && !nextOperator.value) {
      //     break;
      //   }

      //   yield {
      //     stakingModule: null,
      //     meta: null,
      //     key: !nextKey.value ? null : new Key(nextKey.value),
      //     operator: !nextOperator.value ? null : new Operator(nextOperator.value),
      //   };
      // } while (!nextKey.done || !nextOperator.done);
    }
  }
}
