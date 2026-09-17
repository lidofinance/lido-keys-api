import { Inject, Injectable, LoggerService, NotFoundException } from '@nestjs/common';
import { ELBlockSnapshot, StakingModuleResponse } from '../common/entities/';
import { SRModuleCompoundingOperatorListResponse, CompoundingOperator } from './entities';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { StakingRouterService } from '../../staking-router-modules/staking-router.service';
import { EntityManager } from '@mikro-orm/knex';
import { IsolationLevel } from '@mikro-orm/core';
import { SrModuleEntity } from 'storage/sr-module.entity';
import { RegistryOperator } from '../../common/registry';
import {
  COMPOUNDING_CAPABLE_MODULE_TYPES,
  STAKING_MODULE_TYPE,
  WITHDRAWAL_CREDENTIALS_TYPE,
} from '../../staking-router-modules/constants';

@Injectable()
export class SRModulesCompoundingOperatorsService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected stakingRouterService: StakingRouterService,
    protected readonly entityManager: EntityManager,
  ) {}

  // A module supports the compounding operators view only when it is served by the community/CSM
  // implementation (which exposes totalWithdrawnKeys on-chain) AND uses 0x02 withdrawal credentials.
  private isCompoundingModule(module: SrModuleEntity): boolean {
    return (
      COMPOUNDING_CAPABLE_MODULE_TYPES.includes(module.type as STAKING_MODULE_TYPE) &&
      module.withdrawalCredentialsType === WITHDRAWAL_CREDENTIALS_TYPE.COMPOUNDING
    );
  }

  public async getByModule(moduleId: string | number): Promise<SRModuleCompoundingOperatorListResponse> {
    const { operators, module, elBlockSnapshot } = await this.entityManager.transactional(
      async () => {
        const { module, elBlockSnapshot }: { module: SrModuleEntity; elBlockSnapshot: ELBlockSnapshot } =
          await this.stakingRouterService.getStakingModuleAndMeta(moduleId);

        if (!this.isCompoundingModule(module)) {
          throw new NotFoundException(`Module with moduleId ${moduleId} does not support compounding operators`);
        }

        const moduleInstance = this.stakingRouterService.getStakingRouterModuleImpl(module.type);

        const operators: RegistryOperator[] = await moduleInstance.getOperators(module.stakingModuleAddress, {});

        const operatorsResp = operators.map((op) => new CompoundingOperator(op));

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
