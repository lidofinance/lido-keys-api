import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from 'common/config';
import { GroupedByModuleKeyListResponse, SRModuleKeyListResponse } from './entities';
import { ModuleId, KeyQuery, Key, ELBlockSnapshot, SRModule } from 'http/common/entities';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { StakingRouterService } from 'staking-router-modules/staking-router.service';
import { KeyEntity } from 'staking-router-modules/interfaces/staking-module.interface';

@Injectable()
export class SRModulesKeysService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected configService: ConfigService,
    protected stakingRouterService: StakingRouterService,
  ) {}

  async getGroupedByModuleKeys(filters: KeyQuery): Promise<{
    keysGeneratorsByModules: { keysGenerator: AsyncGenerator<Key>; module: SRModule }[];
    meta: { elBlockSnapshot: ELBlockSnapshot };
  }> {
    const { keysGeneratorsByModules, elBlockSnapshot } = await this.stakingRouterService.getKeysByModulesStreamVersion(
      filters,
    );

    return { keysGeneratorsByModules, meta: { elBlockSnapshot } };
  }

  async getModuleKeys(
    moduleId: ModuleId,
    filters: KeyQuery,
  ): Promise<{
    keysGenerator: AsyncGenerator<KeyEntity>;
    module: SRModule;
    meta: { elBlockSnapshot: ELBlockSnapshot };
  }> {
    const { keysGenerator, module, elBlockSnapshot } = await this.stakingRouterService.getModuleKeysStreamVersion(
      moduleId,
      filters,
    );

    return { keysGenerator, module, meta: { elBlockSnapshot } };
  }

  async getModuleKeysByPubKeys(moduleId: ModuleId, pubKeys: string[]): Promise<SRModuleKeyListResponse> {
    const { keys, module, elBlockSnapshot } = await this.stakingRouterService.getModuleKeysByPubKeys(moduleId, pubKeys);
    return {
      data: { keys, module },
      meta: { elBlockSnapshot },
    };
  }
}
