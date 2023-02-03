import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService, GROUPED_ONCHAIN_V1_TYPE } from 'common/config';
import { GroupedByModuleKeyListResponse, SRModuleKeyListResponse } from './entities';
import { RegistryService } from 'jobs/registry.service';
import { ELBlockSnapshot, Key, SRModule, ModuleId, RegistryKey as RespRegistryKey } from 'http/common/entities';
import { RegistryKey } from '@lido-nestjs/registry';
import { getSRModule, getSRModuleByType } from 'http/common/sr-modules.utils';

@Injectable()
export class SRModulesKeysService {
  constructor(protected configService: ConfigService, protected registryService: RegistryService) {}

  async getGroupedByModuleKeys(filters): Promise<GroupedByModuleKeyListResponse> {
    // for each module return keys with meta
    const { keys, meta } = await this.registryService.getKeysWithMeta(filters);

    if (!meta) {
      return {
        data: [],
        meta: null,
      };
    }

    const chainId = this.configService.get('CHAIN_ID');
    const registryModule = getSRModuleByType(GROUPED_ONCHAIN_V1_TYPE, chainId);

    const registryKeys: Key[] = keys.map((key) => new Key(key));

    const elBlockSnapshot = new ELBlockSnapshot(meta);

    return {
      data: [
        {
          keys: registryKeys,
          module: new SRModule(meta.keysOpIndex, registryModule),
        },
      ],
      meta: {
        elBlockSnapshot,
      },
    };
  }

  async getModuleKeys(moduleId: ModuleId, filters): Promise<SRModuleKeyListResponse> {
    // At first we should find module by id in our list, in future without chainId
    const chainId = this.configService.get('CHAIN_ID');
    const module = getSRModule(moduleId, chainId);

    if (!module) {
      throw new NotFoundException(`Module with moduleId ${moduleId} is not supported`);
    }
    // We supppose if module in list, Keys API knows how to work with it
    // it is also important to have consistent module info and meta

    if (module.type == GROUPED_ONCHAIN_V1_TYPE) {
      const { keys, meta } = await this.registryService.getKeysWithMeta(filters);

      if (!meta) {
        return {
          data: null,
          meta: null,
        };
      }

      const registryKeys: RespRegistryKey[] = keys.map((key) => new RegistryKey(key));
      const elBlockSnapshot = new ELBlockSnapshot(meta);

      return {
        data: {
          keys: registryKeys,
          module: new SRModule(meta.keysOpIndex, module),
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
    // At first we should find module by id in our list, in future without chainId
    const chainId = this.configService.get('CHAIN_ID');
    const module = getSRModule(moduleId, chainId);

    if (!module) {
      throw new NotFoundException(`Module with moduleId ${moduleId} is not supported`);
    }
    // We supppose if module in list, Keys API knows how to work with it
    // it is also important to have consistent module info and meta

    if (module.type === GROUPED_ONCHAIN_V1_TYPE) {
      const { keys, meta } = await this.registryService.getKeysWithMetaByPubkeys(pubkeys);

      if (!meta) {
        return {
          data: null,
          meta: null,
        };
      }

      const registryKeys: RespRegistryKey[] = keys.map((key) => new RegistryKey(key));
      const elBlockSnapshot = new ELBlockSnapshot(meta);

      return {
        data: {
          keys: registryKeys,
          module: new SRModule(meta.keysOpIndex, module),
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
