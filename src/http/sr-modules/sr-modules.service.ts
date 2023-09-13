import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { SRModuleResponse, SRModuleListResponse } from './entities';
import { ELBlockSnapshot, SRModule } from '../common/entities';
import { StakingRouterService } from '../../staking-router-modules/staking-router.service';

@Injectable()
export class SRModulesService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected stakingRouterService: StakingRouterService,
  ) {}

  async getModules(): Promise<SRModuleListResponse> {
    const { stakingModules, elBlockSnapshot } = await this.stakingRouterService.getStakingModulesAndMeta();

    const stakingModuleListResponse = stakingModules.map((module) => new SRModule(module));

    return {
      data: stakingModuleListResponse,
      elBlockSnapshot,
    };
  }

  async getModule(moduleId: string | number): Promise<SRModuleResponse> {
    const { module, elBlockSnapshot } = await this.stakingRouterService.getStakingModuleAndMeta(moduleId);

    return {
      data: module,
      elBlockSnapshot: new ELBlockSnapshot(elBlockSnapshot),
    };
  }
}
