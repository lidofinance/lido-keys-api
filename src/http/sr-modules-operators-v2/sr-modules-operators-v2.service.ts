import { Inject, Injectable, LoggerService, NotFoundException } from '@nestjs/common';
import { ELBlockSnapshot, StakingModuleResponse } from '../common/entities/';
import { SRModuleOperatorListResponseV2, OperatorV2 } from './entities';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { StakingRouterService } from '../../staking-router-modules/staking-router.service';
import { EntityManager } from '@mikro-orm/knex';
import { IsolationLevel } from '@mikro-orm/core';
import { SrModuleEntity } from 'storage/sr-module.entity';
import { RegistryOperator } from '../../common/registry';
import { WITHDRAWN_KEYS_CAPABLE_MODULE_TYPES, STAKING_MODULE_TYPE } from '../../staking-router-modules/constants';

@Injectable()
export class SRModulesOperatorsV2Service {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected stakingRouterService: StakingRouterService,
    protected readonly entityManager: EntityManager,
  ) {}

  // A module is supported only when it is served by the community/CSM implementation,
  // which exposes totalWithdrawnKeys on-chain regardless of the withdrawal credentials type.
  private isSupportedModule(module: SrModuleEntity): boolean {
    return WITHDRAWN_KEYS_CAPABLE_MODULE_TYPES.includes(module.type as STAKING_MODULE_TYPE);
  }

  public async getByModule(moduleId: string | number): Promise<SRModuleOperatorListResponseV2> {
    const { operators, module, elBlockSnapshot } = await this.entityManager.transactional(
      async () => {
        const { module, elBlockSnapshot }: { module: SrModuleEntity; elBlockSnapshot: ELBlockSnapshot } =
          await this.stakingRouterService.getStakingModuleAndMeta(moduleId);

        if (!this.isSupportedModule(module)) {
          throw new NotFoundException(`Module with moduleId ${moduleId} is not supported by v2 operators endpoint`);
        }

        const moduleInstance = this.stakingRouterService.getStakingRouterModuleImpl(module.type);

        const operators: RegistryOperator[] = await moduleInstance.getOperators(module.stakingModuleAddress, {});

        const operatorsResp = operators.map((op) => new OperatorV2(op));

        return { operators: operatorsResp, module, elBlockSnapshot };
      },
      { isolationLevel: IsolationLevel.REPEATABLE_READ },
    );

    return {
      data: {
        operators,
        module: new StakingModuleResponse(module),
      },
      meta: { elBlockSnapshot },
    };
  }
}
