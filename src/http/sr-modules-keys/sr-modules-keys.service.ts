import { Inject, Injectable, NotFoundException, LoggerService } from '@nestjs/common';
import { ConfigService } from 'common/config';
import { GroupedByModuleKeyListResponse, SRModuleKeyListResponse } from './entities';
import { ELBlockSnapshot, Key, SRModule, ModuleId, CuratedKey, KeyQuery } from 'http/common/response-entities';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { CuratedModuleService, STAKING_MODULE_TYPE } from 'staking-router-modules';
import { KeysUpdateService } from 'jobs/keys-update';

@Injectable()
export class SRModulesKeysService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected configService: ConfigService,
    protected curatedService: CuratedModuleService,
    protected keysUpdateService: KeysUpdateService,
  ) {}

  async getGroupedByModuleKeys(filters: KeyQuery): Promise<GroupedByModuleKeyListResponse> {
    const stakingModules = await this.keysUpdateService.getStakingModules();

    if (stakingModules.length == 0) {
      return {
        data: [],
        meta: null,
      };
    }

    // keys could be of type CuratedKey | CommunityKey
    const collectedData: { keys: Key[]; module: SRModule }[] = [];
    let elBlockSnapshot: ELBlockSnapshot | null = null;

    // Because of current lido-nestjs/registry implementation in case of more than one
    // staking router module we need to wrap code below in transaction (with serializable isolation level that is default in mikro orm )
    // to prevent reading keys for different blocks
    // But now we have only one module and in current future we will try to find solution without transactions

    // stakingModules list contains only module types we know
    for (let i = 0; i < stakingModules.length; i++) {
      if (stakingModules[i].type == STAKING_MODULE_TYPE.CURATED_ONCHAIN_V1_TYPE) {
        const { keys: curatedKeys, meta } = await this.curatedService.getKeysWithMeta({
          used: filters.used,
          operatorIndex: filters.operatorIndex,
        });

        if (!meta) {
          this.logger.warn(`Meta is null, maybe data hasn't been written in db yet.`);
          return {
            data: [],
            meta: null,
          };
        }

        // meta should be the same for all modules
        // so in answer we can use meta of any module
        // lets use meta of first module in list
        // currently we sure if stakingModules is not empty, we will have in list Curated Module
        // in future this check should be in each if clause
        if (i == 0) {
          elBlockSnapshot = new ELBlockSnapshot(meta);
        }

        const keys: Key[] = curatedKeys.map((key) => new Key(key));

        collectedData.push({ keys, module: new SRModule(meta.keysOpIndex, stakingModules[i]) });
      }
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

  async getModuleKeys(moduleId: ModuleId, filters: KeyQuery): Promise<SRModuleKeyListResponse> {
    const stakingModule = await this.keysUpdateService.getStakingModule(moduleId);

    if (!stakingModule) {
      throw new NotFoundException(`Module with moduleId ${moduleId} is not supported`);
    }

    // We suppose if module in list, Keys API knows how to work with it
    // it is also important to have consistent module info and meta

    if (stakingModule.type === STAKING_MODULE_TYPE.CURATED_ONCHAIN_V1_TYPE) {
      const { keys, meta } = await this.curatedService.getKeysWithMeta({
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

      const elBlockSnapshot = new ELBlockSnapshot(meta);

      return {
        data: {
          keys: curatedKeys,
          module: new SRModule(meta.keysOpIndex, stakingModule),
        },
        meta: {
          elBlockSnapshot,
        },
      };
    }

    // compare type with other types
    throw new NotFoundException(`Modules with other types are not supported`);
  }

  async getModuleKeysByPubkeys(moduleId: ModuleId, pubkeys: string[]): Promise<SRModuleKeyListResponse> {
    const stakingModule = await this.keysUpdateService.getStakingModule(moduleId);

    if (!stakingModule) {
      throw new NotFoundException(`Module with moduleId ${moduleId} is not supported`);
    }

    // We suppose if module in list, Keys API knows how to work with it
    // it is also important to have consistent module info and meta

    if (stakingModule.type === STAKING_MODULE_TYPE.CURATED_ONCHAIN_V1_TYPE) {
      const { keys, meta } = await this.curatedService.getKeysWithMetaByPubkeys(pubkeys);

      if (!meta) {
        this.logger.warn(`Meta is null, maybe data hasn't been written in db yet.`);
        return {
          data: null,
          meta: null,
        };
      }

      const registryKeys: CuratedKey[] = keys.map((key) => new CuratedKey(key));
      const elBlockSnapshot = new ELBlockSnapshot(meta);

      return {
        data: {
          keys: registryKeys,
          module: new SRModule(meta.keysOpIndex, stakingModule),
        },
        meta: {
          elBlockSnapshot,
        },
      };
    }

    // compare type with other types
    throw new NotFoundException(`Modules with other types are not supported`);
  }
}
