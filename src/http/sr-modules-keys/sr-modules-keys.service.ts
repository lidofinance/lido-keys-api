import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from 'common/config';
import { GroupedByModuleKeyListResponse, SRModuleKeyListResponse, RegistryKey } from './entities';
import { RegistryService } from 'jobs/registry.service';
import { ELBlockSnapshot, Key, SRModule } from 'http/common/entities';
import { RegistryMeta } from '@lido-nestjs/registry';
import { ModuleId } from 'http/common/entities/';
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
    const registryModule = getSRModuleByType('grouped-onchain-v1', chainId);

    const registryKeys: Key[] = keys.map((key) => this.formKey(key));

    const elBlockSnapshot = this.formELBlockSnapshot(meta);

    return {
      data: [
        {
          keys: registryKeys,
          module: this.formSRModule(meta.keysOpIndex, registryModule),
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

    if (module.type == 'grouped-onchain-v1') {
      const { keys, meta } = await this.registryService.getKeysWithMeta(filters);

      if (!meta) {
        return {
          data: null,
          meta: null,
        };
      }

      const registryKeys: RegistryKey[] = keys.map((key) => this.formRegistryKey(key));
      const elBlockSnapshot = this.formELBlockSnapshot(meta);

      return {
        data: {
          keys: registryKeys,
          module: this.formSRModule(meta.keysOpIndex, module),
        },
        meta: {
          elBlockSnapshot,
        },
      };
    }

    // compare type with other types
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

    if (module.type == 'grouped-onchain-v1') {
      const { keys, meta } = await this.registryService.getKeysWithMetaByPubkeys(pubkeys);

      if (!meta) {
        return {
          data: null,
          meta: null,
        };
      }

      const registryKeys: RegistryKey[] = keys.map((key) => this.formRegistryKey(key));
      const elBlockSnapshot = this.formELBlockSnapshot(meta);

      return {
        data: {
          keys: registryKeys,
          module: this.formSRModule(meta.keysOpIndex, module),
        },
        meta: {
          elBlockSnapshot,
        },
      };
    }
    // compare type with other types
  }

  // at the moment part of information is in json file and another part in meta table of registry lib
  private formSRModule(nonce: number, module): SRModule {
    return {
      nonce: nonce,
      type: module.type,
      id: module.id,
      stakingModuleAddress: module.stakingModuleAddress,
      moduleFee: module.moduleFee,
      treasuryFee: module.treasuryFee,
      targetShare: module.targetShare,
      status: module.status,
      name: module.name,
      lastDepositAt: module.lastDepositAt,
      lastDepositBlock: module.lastDepositBlock,
    };
  }

  private formKey(key): Key {
    return {
      key: key.key,
      depositSignature: key.depositSignature,
      operatorIndex: key.operatorIndex,
      used: key.used,
    };
  }

  private formELBlockSnapshot(meta: RegistryMeta): ELBlockSnapshot | null {
    return {
      blockNumber: meta.blockNumber,
      blockHash: meta.blockHash,
      timestamp: meta.timestamp,
    };
  }

  private formRegistryKey(key): RegistryKey {
    return {
      key: key.key,
      depositSignature: key.depositSignature,
      operatorIndex: key.operatorIndex,
      index: key.index,
      used: key.used,
    };
  }
}
