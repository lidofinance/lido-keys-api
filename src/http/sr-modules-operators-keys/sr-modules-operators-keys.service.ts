import { Inject, Injectable, NotFoundException, LoggerService } from '@nestjs/common';
import { ELBlockSnapshot, ModuleId, SRModule } from 'http/common/response-entities';
import { CuratedOperator, CuratedKey } from 'http/common/response-entities';
import { KeyQuery } from 'http/common/response-entities';
import { ConfigService } from 'common/config';
import { SRModuleOperatorsKeysResponse } from './entities';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { StakingRouterService } from 'staking-router-modules';

@Injectable()
export class SRModulesOperatorsKeysService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected readonly stakingRouterService: StakingRouterService,
    protected readonly configService: ConfigService,
  ) {}

  public async get(moduleId: ModuleId, filters: KeyQuery): Promise<SRModuleOperatorsKeysResponse> {
    const stakingModule = this.stakingRouterService.getStakingModuleTooling(moduleId);

    if (!stakingModule) {
      throw new NotFoundException(`Module with moduleId ${moduleId} is not supported`);
    }

    const { keys, operators, meta } = await stakingModule.tooling.getData({
      used: filters.used,
      operatorIndex: filters.operatorIndex,
    });

    if (!meta) {
      this.logger.warn(`Meta is null, maybe data hasn't been written in db yet.`);
      return {
        data: null,
        meta: null,
      };
    }

    const curatedKeys: CuratedKey[] = keys.map((key) => new CuratedKey(key));
    // TODO: fix
    const curatedOperators: CuratedOperator[] = operators.map((op) => new CuratedOperator(op));
    const elBlockSnapshot = new ELBlockSnapshot(meta);

    return {
      data: {
        operators: curatedOperators,
        keys: curatedKeys,
        module: new SRModule(meta.keysOpIndex, stakingModule.stakingModule),
      },

      meta: {
        elBlockSnapshot,
      },
    };
  }
}
