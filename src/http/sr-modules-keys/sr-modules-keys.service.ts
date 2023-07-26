import { Inject, Injectable, NotFoundException, LoggerService } from '@nestjs/common';
import { ConfigService } from 'common/config';
import { GroupedByModuleKeyListResponse, SRModuleKeyListResponse } from './entities';
import { ELBlockSnapshot, SRModule, ModuleId, CuratedKey, KeyQuery } from 'http/common/entities';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { httpExceptionTooEarlyResp } from 'http/common/entities/http-exceptions/too-early-resp';
import { StakingRouterService } from 'staking-router-modules/staking-router.service';
import { EntityManager } from '@mikro-orm/knex';
import { ElMetaStorageService } from 'storage/el-meta.storage';
import { CuratedModuleService } from 'staking-router-modules';

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
