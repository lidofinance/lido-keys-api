import { Injectable } from '@nestjs/common';
import { ConfigService } from 'common/config';
import { stakingRouterModules } from 'common/config';
import { StakingRouterModuleResponse } from './entities';

@Injectable()
export class StakingRouterModulesService {
  constructor(protected configService: ConfigService) {}

  get(): StakingRouterModuleResponse {
    const chainId = this.configService.get('CHAIN_ID');

    return {
      data: stakingRouterModules[chainId],
    };
  }
}
