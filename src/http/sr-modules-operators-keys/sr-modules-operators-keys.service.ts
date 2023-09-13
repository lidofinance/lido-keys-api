import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ELBlockSnapshot, Key, Operator, SRModule } from '../common/entities';
import { KeyQuery } from '../common/entities';

import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { StakingRouterService } from '../../staking-router-modules/staking-router.service';

@Injectable()
export class SRModulesOperatorsKeysService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected stakingRouterService: StakingRouterService,
  ) {}

  public async get(
    moduleId: string | number,
    filters: KeyQuery,
  ): Promise<{
    keysGenerator: AsyncGenerator<Key>;
    operators: Operator[];
    module: SRModule;
    meta: { elBlockSnapshot: ELBlockSnapshot };
  }> {
    const { module, elBlockSnapshot } = await this.stakingRouterService.getStakingModuleAndMeta(moduleId);

    const moduleInstance = this.stakingRouterService.getStakingRouterModuleImpl(module.type);

    const keysGenerator: AsyncGenerator<Key> = await moduleInstance.getKeysStream(module.stakingModuleAddress, filters);
    const operatorsFilter = filters.operatorIndex ? { index: filters.operatorIndex } : {};
    const operators: Operator[] = await moduleInstance.getOperators(module.stakingModuleAddress, operatorsFilter);

    return { operators, keysGenerator, module, meta: { elBlockSnapshot } };
  }
}
