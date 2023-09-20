import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { SRModuleResponse, SRModuleListResponse } from './entities';
import { ELBlockSnapshot, StakingModuleResponse } from '../common/entities';
import { StakingRouterService } from '../../staking-router-modules/staking-router.service';
import { SrModuleEntity } from 'storage/sr-module.entity';

@Injectable()
export class SRModulesService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected stakingRouterService: StakingRouterService,
  ) {}

  async getModules(): Promise<SRModuleListResponse> {
    const { stakingModules, elBlockSnapshot } = await this.stakingRouterService.getStakingModulesAndMeta();

    const stakingModuleListResponse = stakingModules.map((stakingModule) => new StakingModuleResponse(stakingModule));

    return {
      data: stakingModuleListResponse,
      elBlockSnapshot,
    };
  }

  async getModule(moduleId: string | number): Promise<SRModuleResponse> {
    const { module, elBlockSnapshot }: { module: SrModuleEntity; elBlockSnapshot: ELBlockSnapshot } =
      await this.stakingRouterService.getStakingModuleAndMeta(moduleId);

    return {
      data: new StakingModuleResponse(module),
      elBlockSnapshot: new ELBlockSnapshot(elBlockSnapshot),
    };
  }
}
