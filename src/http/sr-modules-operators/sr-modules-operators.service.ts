import { Inject, Injectable, NotFoundException, LoggerService } from '@nestjs/common';
import { ConfigService } from 'common/config';
import { ELBlockSnapshot, SRModule } from 'http/common/response-entities';
import {
  GroupedByModuleOperatorListResponse,
  SRModuleOperatorListResponse,
  SRModuleOperatorResponse,
} from './entities';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { StakingRouterService, STAKING_MODULE_TYPE, ModuleId } from 'staking-router-modules';
import {
  StakingModuleOperatorResponse,
  srModuleOperatorMapper,
} from 'http/common/response-entities/operators/sr-module-operator';

@Injectable()
export class SRModulesOperatorsService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected configService: ConfigService,
    protected stakingRouterService: StakingRouterService,
  ) {}

  public async getAll(): Promise<GroupedByModuleOperatorListResponse> {
    const stakingModules = await this.stakingRouterService.getStakingModulesTooling();

    if (stakingModules.length == 0) {
      return {
        data: [],
        meta: null,
      };
    }

    const collectedData: { operators: StakingModuleOperatorResponse[]; module: SRModule }[] = [];
    let elBlockSnapshot: ELBlockSnapshot | null = null;

    // Because of current lido-nestjs/registry implementation in case of more than one
    // staking router module we need to wrap code below in transaction (with serializable isolation level that is default in mikro orm )
    // to prevent reading keys for different blocks
    // But now we have only one module and in current future we will try to find solution without transactions
    // TODO: keep in mind that here should be a transaction

    for (const [index, { stakingModule, tooling }] of stakingModules.entries()) {
      const { operators: moduleOperators, meta } = await tooling.getOperatorsWithMeta();

      if (!meta) {
        this.logger.warn(`Meta is null, maybe data hasn't been written in db yet.`);
        return {
          data: [],
          meta: null,
        };
      }

      const operators: StakingModuleOperatorResponse[] = moduleOperators.map((op) =>
        srModuleOperatorMapper(stakingModule.type, op),
      );

      // meta should be the same for all modules
      // so in answer we can use meta of any module
      // lets use meta of first module in list
      if (index == 0) {
        elBlockSnapshot = new ELBlockSnapshot(meta);
      }

      collectedData.push({ operators, module: new SRModule(meta.keysOpIndex, stakingModule) });
    }

    // we check stakingModules list types so this condition should never be true
    if (!elBlockSnapshot) {
      return {
        data: [],
        meta: null,
      };
    }

    return {
      data: collectedData,
      meta: {
        elBlockSnapshot,
      },
    };
  }

  public async getByModule(moduleId: ModuleId): Promise<SRModuleOperatorListResponse> {
    const stakingModule = await this.keysUpdateService.getStakingModule(moduleId);

    if (!stakingModule) {
      throw new NotFoundException(`Module with moduleId ${moduleId} is not supported`);
    }

    // We suppose if module in list, Keys API knows how to work with it
    // it is also important to have consistent module info and meta

    if (stakingModule.type === STAKING_MODULE_TYPE.CURATED_ONCHAIN_V1_TYPE) {
      const { operators, meta } = await this.curatedService.getOperatorsWithMeta();

      if (!meta) {
        this.logger.warn(`Meta is null, maybe data hasn't been written in db yet.`);
        return {
          data: null,
          meta: null,
        };
      }

      const curatedOperators: CuratedOperator[] = operators.map((op) => new CuratedOperator(op));
      const elBlockSnapshot = new ELBlockSnapshot(meta);

      return {
        data: { operators: curatedOperators, module: new SRModule(meta.keysOpIndex, stakingModule) },
        meta: {
          elBlockSnapshot,
        },
      };
    }

    throw new NotFoundException(`Modules with other types are not supported`);
  }

  public async getModuleOperator(moduleId: ModuleId, operatorIndex: number): Promise<SRModuleOperatorResponse> {
    const stakingModule = await this.keysUpdateService.getStakingModule(moduleId);

    if (!stakingModule) {
      throw new NotFoundException(`Module with moduleId ${moduleId} is not supported`);
    }

    // We suppose if module in list, Keys API knows how to work with it
    // it is also important to have consistent module info and meta

    if (stakingModule.type === STAKING_MODULE_TYPE.CURATED_ONCHAIN_V1_TYPE) {
      const { operator, meta } = await this.curatedService.getOperatorByIndex(operatorIndex);

      if (!meta) {
        this.logger.warn(`Meta is null, maybe data hasn't been written in db yet.`);
        return {
          data: null,
          meta: null,
        };
      }

      if (!operator) {
        throw new NotFoundException(
          `Operator with index ${operatorIndex} is not found for module with moduleId ${moduleId}`,
        );
      }

      const curatedOperator: CuratedOperator = new CuratedOperator(operator);
      const elBlockSnapshot = new ELBlockSnapshot(meta);
      return {
        data: { operator: curatedOperator, module: new SRModule(meta.keysOpIndex, stakingModule) },
        meta: {
          elBlockSnapshot,
        },
      };
    }

    throw new NotFoundException(`Modules with other types are not supported`);
  }
}
