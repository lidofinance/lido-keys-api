import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from 'common/config';
import { GroupedByModuleKeyListResponse, SRModuleKeyListResponse } from './entities';
import { ModuleId, KeyQuery } from 'http/common/entities';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { StakingRouterService } from 'staking-router-modules/staking-router.service';

@Injectable()
export class SRModulesKeysService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected configService: ConfigService,
    protected stakingRouterService: StakingRouterService,
  ) {}

  async getGroupedByModuleKeys(filters: KeyQuery): Promise<GroupedByModuleKeyListResponse> {
    return await this.stakingRouterService.getKeysByModules(filters);
  }

  async getModuleKeys(moduleId: ModuleId, filters: KeyQuery): Promise<SRModuleKeyListResponse> {
    return await this.stakingRouterService.getModuleKeys(moduleId, filters);
  }

  async getModuleKeysByPubKeys(moduleId: ModuleId, pubKeys: string[]): Promise<SRModuleKeyListResponse> {
    return await this.stakingRouterService.getModuleKeysByPubKeys(moduleId, pubKeys);
  }
}
