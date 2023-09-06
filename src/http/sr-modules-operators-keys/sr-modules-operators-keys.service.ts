import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ELBlockSnapshot, ModuleId, SRModule } from 'http/common/entities';
import { KeyQuery } from 'http/common/entities';
import { ConfigService } from 'common/config';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { StakingRouterService } from 'staking-router-modules/staking-router.service';
import { KeyEntity, OperatorEntity } from 'staking-router-modules/interfaces/staking-module.interface';
import { EntityManager } from '@mikro-orm/knex';
import { MetaStreamRecord, ModulesOperatorsKeysRecord } from './sr-modules-operators-keys.types';

@Injectable()
export class SRModulesOperatorsKeysService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected readonly configService: ConfigService,
    protected readonly stakingRouterService: StakingRouterService,
    readonly entityManager: EntityManager,
  ) {}

  public async get(
    moduleId: ModuleId,
    filters: KeyQuery,
  ): Promise<{
    keysGenerator: AsyncGenerator<KeyEntity>;
    operators: OperatorEntity[];
    module: SRModule;
    meta: { elBlockSnapshot: ELBlockSnapshot };
  }> {
    const { module, elBlockSnapshot } = await this.stakingRouterService.getStakingModuleAndMeta(moduleId);

    const moduleInstance = this.stakingRouterService.getStakingRouterModuleImpl(module.type);

    const keysGenerator: AsyncGenerator<KeyEntity> = moduleInstance.getKeysStream(module.stakingModuleAddress, filters);
    const operatorsFilter = filters.operatorIndex ? { index: filters.operatorIndex } : {};
    const operators: OperatorEntity[] = await moduleInstance.getOperators(module.stakingModuleAddress, operatorsFilter);

    return { operators, keysGenerator, module, meta: { elBlockSnapshot } };
  }

  public async *getModulesOperatorsKeysGenerator(): AsyncGenerator<ModulesOperatorsKeysRecord> {
    const { stakingModules, elBlockSnapshot } = await this.stakingRouterService.getStakingModulesAndMeta();

    const meta: MetaStreamRecord = { elBlockSnapshot };
    for (const stakingModule of stakingModules) {
      const moduleInstance = this.stakingRouterService.getStakingRouterModuleImpl(stakingModule.type);

      const keysGenerator = moduleInstance.getKeysStream(stakingModule.stakingModuleAddress, {});
      const operatorsGenerator = moduleInstance.getOperatorsStream(stakingModule.stakingModuleAddress, {});

      let nextKey = await keysGenerator.next();
      let nextOperator = await operatorsGenerator.next();

      yield {
        stakingModule,
        meta,
        key: nextKey.value || null,
        operator: nextOperator.value || null,
      };

      do {
        if (!nextKey.done) {
          nextKey = await keysGenerator.next();
        }

        if (!nextOperator.done) {
          nextOperator = await operatorsGenerator.next();
        }

        yield {
          stakingModule: null,
          meta: null,
          key: nextKey.value || null,
          operator: nextOperator.value || null,
        };
      } while (!nextKey.done || !nextOperator.done);
    }
  }
}
