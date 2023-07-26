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
    // TODO: maybe move to staking-module-service
    const { stakingModules, elMeta } = await this.entityManager.transactional(
      async () => {
        const elMeta = await this.stakingRouterService.getElBlockSnapshot();
        const stakingModules = await this.stakingRouterService.getStakingModules();
        return { stakingModules, elMeta };
      },
      { isolationLevel: IsolationLevel.REPEATABLE_READ },
    );

    if (stakingModules.length == 0) {
      this.logger.warn("No staking modules in list. Maybe didn't fetched from SR yet");
      throw httpExceptionTooEarlyResp();
    }

    if (!elMeta) {
      this.logger.warn("Meta is null, maybe data hasn't been written in db yet.");
      throw httpExceptionTooEarlyResp();
    }

    const stakingModuleListResponse = stakingModules.map((module) => new SRModule(module));

    return {
      data: stakingModuleListResponse,
      elBlockSnapshot: new ELBlockSnapshot(elMeta),
    };
  }

  async getModule(moduleId: ModuleId): Promise<SRModuleResponse> {
    const { stakingModule, elMeta } = await this.entityManager.transactional(
      async () => {
        const elMeta = await this.stakingRouterService.getElBlockSnapshot();
        const stakingModule = await this.stakingRouterService.getStakingModule(moduleId);
        return { stakingModule, elMeta };
      },
      { isolationLevel: IsolationLevel.REPEATABLE_READ },
    );

    // TODO: check if responses of this endpoint satisfy our document

    if (!stakingModule) {
      throw new NotFoundException(`Module with moduleId ${moduleId} is not supported`);
    }

    if (!elMeta) {
      this.logger.warn("Meta is null, maybe data hasn't been written in db yet.");
      throw httpExceptionTooEarlyResp();
    }

    return {
      data: new SRModule(stakingModule),
      elBlockSnapshot: new ELBlockSnapshot(elMeta),
    };
  }
}
