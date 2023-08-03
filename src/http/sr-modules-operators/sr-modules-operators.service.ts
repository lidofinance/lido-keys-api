import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from 'common/config';
import { ModuleId } from 'http/common/entities/';
import {
  GroupedByModuleOperatorListResponse,
  SRModuleOperatorListResponse,
  SRModuleOperatorResponse,
} from './entities';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { StakingRouterService } from 'staking-router-modules/staking-router.service';

@Injectable()
export class SRModulesOperatorsService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected configService: ConfigService,
    protected stakingRouterService: StakingRouterService,
  ) {}

  public async getAll(): Promise<GroupedByModuleOperatorListResponse> {
    const { operatorsByModules, elBlockSnapshot } = await this.stakingRouterService.getOperatorsByModules();

    return { data: operatorsByModules, meta: { elBlockSnapshot } };
  }

  public async getByModule(moduleId: ModuleId): Promise<SRModuleOperatorListResponse> {
    const { operators, module, elBlockSnapshot } = await this.stakingRouterService.getModuleOperators(moduleId);
    return {
      data: {
        operators,
        module,
      },
      meta: { elBlockSnapshot },
    };
  }

  public async getModuleOperator(moduleId: ModuleId, operatorIndex: number): Promise<SRModuleOperatorResponse> {
    const { operator, module, elBlockSnapshot } = await this.stakingRouterService.getModuleOperator(
      moduleId,
      operatorIndex,
    );
    return {
      data: { operator, module },
      meta: { elBlockSnapshot },
    };
  }
}
