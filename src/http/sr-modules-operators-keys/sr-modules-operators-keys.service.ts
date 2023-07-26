import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ModuleId } from 'http/common/entities';
import { KeyQuery } from 'http/common/entities';
import { ConfigService } from 'common/config';
import { SRModuleOperatorsKeysResponse } from './entities';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { StakingRouterService } from 'staking-router-modules/staking-router.service';

@Injectable()
export class SRModulesOperatorsKeysService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected readonly configService: ConfigService,
    protected stakingRouterService: StakingRouterService,
  ) {}

  public async get(moduleId: ModuleId, filters: KeyQuery): Promise<SRModuleOperatorsKeysResponse> {
    return await this.stakingRouterService.getModuleOperatorsAndKeys(moduleId, filters);
  }
}
