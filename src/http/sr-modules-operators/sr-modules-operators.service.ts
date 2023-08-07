import { Inject, Injectable, LoggerService, NotFoundException } from '@nestjs/common';
import { ConfigService } from 'common/config';
import { ModuleId, SRModule } from 'http/common/entities/';
import {
  GroupedByModuleOperatorListResponse,
  SRModuleOperatorListResponse,
  SRModuleOperatorResponse,
} from './entities';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { StakingRouterService } from 'staking-router-modules/staking-router.service';
import { EntityManager } from '@mikro-orm/knex';
import { OperatorEntity } from 'staking-router-modules/interfaces/staking-module.interface';
import { IsolationLevel } from '@mikro-orm/core';

@Injectable()
export class SRModulesOperatorsService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected configService: ConfigService,
    protected stakingRouterService: StakingRouterService,
    protected readonly entityManager: EntityManager,
  ) {}

  public async getAll(): Promise<GroupedByModuleOperatorListResponse> {
    const { operatorsByModules, elBlockSnapshot } = await this.entityManager.transactional(
      async () => {
        const { stakingModules, elBlockSnapshot } = await this.stakingRouterService.getStakingModulesAndMeta();
        // TODO: have in http/entities/curated-operator
        const operatorsByModules: { operators: OperatorEntity[]; module: SRModule }[] = [];

        for (const module of stakingModules) {
          const moduleInstance = this.stakingRouterService.getStakingRouterModuleImpl(module.type);
          //  /v1/operators return these common fields for all modules
          const operators: OperatorEntity[] = await moduleInstance.getOperators(module.stakingModuleAddress, {});

          operatorsByModules.push({ operators, module: new SRModule(module) });
        }

        return { operatorsByModules, elBlockSnapshot };
      },
      { isolationLevel: IsolationLevel.REPEATABLE_READ },
    );

    return { data: operatorsByModules, meta: { elBlockSnapshot } };
  }

  public async getByModule(moduleId: ModuleId): Promise<SRModuleOperatorListResponse> {
    const { operators, module, elBlockSnapshot } = await this.entityManager.transactional(
      async () => {
        const { module, elBlockSnapshot } = await this.stakingRouterService.getStakingModuleAndMeta(moduleId);

        const moduleInstance = this.stakingRouterService.getStakingRouterModuleImpl(module.type);

        //  /v1/operators return these common fields for all modules
        const operators: OperatorEntity[] = await moduleInstance.getOperators(module.stakingModuleAddress, {});

        return { operators, module, elBlockSnapshot };
      },
      { isolationLevel: IsolationLevel.REPEATABLE_READ },
    );
    return {
      data: {
        operators,
        module,
      },
      meta: { elBlockSnapshot },
    };
  }

  public async getModuleOperator(moduleId: ModuleId, operatorIndex: number): Promise<SRModuleOperatorResponse> {
    const { operator, module, elBlockSnapshot } = await this.entityManager.transactional(
      async () => {
        const { module, elBlockSnapshot } = await this.stakingRouterService.getStakingModuleAndMeta(moduleId);
        const moduleInstance = this.stakingRouterService.getStakingRouterModuleImpl(module.type);

        const operator: OperatorEntity | null = await moduleInstance.getOperator(
          module.stakingModuleAddress,
          operatorIndex,
        );

        return { operator, module, elBlockSnapshot };
      },
      { isolationLevel: IsolationLevel.REPEATABLE_READ },
    );

    if (!operator) {
      throw new NotFoundException(
        `Operator with index ${operatorIndex} is not found for module with moduleId ${moduleId}`,
      );
    }
    return {
      data: { operator, module },
      meta: { elBlockSnapshot },
    };
  }
}
