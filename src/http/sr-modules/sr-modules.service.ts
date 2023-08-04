import { Inject, Injectable, NotFoundException, LoggerService } from '@nestjs/common';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { ConfigService } from 'common/config';
import { SRModuleResponse, SRModuleListResponse } from './entities';
import { ELBlockSnapshot, SRModule } from 'http/common/entities';
import { ModuleId } from 'http/common/entities/';
import { httpExceptionTooEarlyResp } from 'http/common/entities/http-exceptions/too-early-resp';
import { StakingRouterService } from 'staking-router-modules/staking-router.service';
import { IsolationLevel } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/knex';

@Injectable()
export class SRModulesService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected configService: ConfigService,
    private readonly entityManager: EntityManager,
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

  async getModule(moduleId: ModuleId): Promise<SRModuleResponse> {
    const { module, elBlockSnapshot } = await this.stakingRouterService.getStakingModuleAndMeta(moduleId);

    return {
      data: module,
      elBlockSnapshot: new ELBlockSnapshot(elBlockSnapshot),
    };
  }
}
