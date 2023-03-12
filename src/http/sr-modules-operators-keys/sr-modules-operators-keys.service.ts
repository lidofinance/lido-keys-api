import { Inject, Injectable, NotFoundException, LoggerService } from '@nestjs/common';
import { ELBlockSnapshot, ModuleId, SRModule } from 'http/common/entities';
import { CuratedOperator, CuratedKey } from 'http/common/entities';
import { KeyQuery } from 'http/common/entities';
import { ConfigService } from 'common/config';
import { SRModuleOperatorsKeysResponse } from './entities';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { CuratedModuleService, STAKING_MODULE_TYPE } from 'staking-router-modules';
import { KeysUpdateService } from 'jobs/keys-update';

@Injectable()
export class SRModulesOperatorsKeysService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected readonly curatedService: CuratedModuleService,
    protected readonly configService: ConfigService,
    protected keysUpdateService: KeysUpdateService,
  ) {}

  public async get(moduleId: ModuleId, filters: KeyQuery): Promise<SRModuleOperatorsKeysResponse> {
    const stakingModule = await this.keysUpdateService.getStakingModule(moduleId);

    if (!stakingModule) {
      throw new NotFoundException(`Module with moduleId ${moduleId} is not supported`);
    }

    // We suppose if module in list, Keys API knows how to work with it
    // it is also important to have consistent module info and meta

    if (stakingModule.type === STAKING_MODULE_TYPE.CURATED_ONCHAIN_V1_TYPE) {
      const { keys, operators, meta } = await this.curatedService.getData({
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
      const curatedOperators: CuratedOperator[] = operators.map((op) => new CuratedOperator(op));
      const elBlockSnapshot = new ELBlockSnapshot(meta);

      return {
        data: {
          operators: curatedOperators,
          keys: curatedKeys,
          module: new SRModule(meta.keysOpIndex, stakingModule),
        },

        meta: {
          elBlockSnapshot,
        },
      };
    }

    throw new NotFoundException(`Modules with other types are not supported`);
  }
}
