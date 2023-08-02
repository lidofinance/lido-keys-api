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
    return await this.stakingRouterService.getOperatorsByModules();
  }

  public async getByModule(moduleId: ModuleId): Promise<SRModuleOperatorListResponse> {
    return await this.stakingRouterService.getModuleOperators(moduleId);
  }

  public async getModuleOperator(moduleId: ModuleId, operatorIndex: number): Promise<SRModuleOperatorResponse> {
    return await this.stakingRouterService.getModuleOperator(moduleId, operatorIndex);
  }
}
