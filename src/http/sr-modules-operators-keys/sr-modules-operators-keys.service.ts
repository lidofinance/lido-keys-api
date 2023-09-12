import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ELBlockSnapshot, Key, ModuleId, Operator, SRModule } from 'http/common/entities';
import { KeyQuery } from 'http/common/entities';
import { ConfigService } from 'common/config';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { StakingRouterService } from 'staking-router-modules/staking-router.service';
import { EntityManager } from '@mikro-orm/knex';

@Injectable()
export class SRModulesOperatorsKeysService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected readonly configService: ConfigService,
    protected stakingRouterService: StakingRouterService,
    protected readonly entityManager: EntityManager,
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
