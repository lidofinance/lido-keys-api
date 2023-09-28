import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ELBlockSnapshot, Key, Operator, StakingModuleResponse } from '../common/entities';
import { KeyQuery } from '../common/entities';

import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { StakingRouterService } from '../../staking-router-modules/staking-router.service';
import { SrModuleEntity } from 'storage/sr-module.entity';
import { RegistryOperator } from '../../common/registry';

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
    module: StakingModuleResponse;
    meta: { elBlockSnapshot: ELBlockSnapshot };
  }> {
    const { module, elBlockSnapshot }: { module: SrModuleEntity; elBlockSnapshot: ELBlockSnapshot } =
      await this.stakingRouterService.getStakingModuleAndMeta(moduleId);

    const moduleInstance = this.stakingRouterService.getStakingRouterModuleImpl(module.type);

    const keysGenerator: AsyncGenerator<Key> = await moduleInstance.getKeysStream(module.stakingModuleAddress, filters);
    const operatorsFilter = {};

    if (filters.operatorIndex != undefined) {
      operatorsFilter['index'] = filters.operatorIndex;
    }
    const operators: RegistryOperator[] = await moduleInstance.getOperators(
      module.stakingModuleAddress,
      operatorsFilter,
    );

    const operatorsResp = operators.map((op) => new Operator(op));

    return {
      operators: operatorsResp,
      keysGenerator,
      module: new StakingModuleResponse(module),
      meta: { elBlockSnapshot },
    };
  }
}
