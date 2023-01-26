import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from 'common/config';
import { SRModuleResponse, SRModuleListResponse } from './entities';
import { RegistryService } from 'jobs/registry.service';
import { ELBlockSnapshot, SRModule } from 'http/common/entities';
import { RegistryMeta } from '@lido-nestjs/registry';
import { ModuleId } from 'http/common/entities/';
import { getSRModule, getSRModuleByType } from 'http/common/sr-modules.utils';

@Injectable()
export class SRModulesService {
  constructor(protected configService: ConfigService, protected registryService: RegistryService) {}

  async getModules(): Promise<SRModuleListResponse> {
    // Currently modules information is fixed in json
    // at the moment api support only NodeOperatorsRegistry contract
    // so we form here list only from infomation of this contract
    // than we will get information from SR contract
    // it is also important to have consistent module info and meta

    const chainId = this.configService.get('CHAIN_ID');
    const registryModule = getSRModuleByType('grouped-onchain-v1', chainId);
    const meta = await this.registryService.getMetaDataFromStorage();
    const elBlockSnapshot = this.formELBlockSnapshot(meta);

    return {
      data: [this.formSRModule(meta.keysOpIndex, registryModule)],
      elBlockSnapshot,
    };
  }

  async getModule(moduleId: ModuleId): Promise<SRModuleResponse> {
    // At first we should find module by id in our list, in future without chainId
    const chainId = this.configService.get('CHAIN_ID');
    const module = getSRModule(moduleId, chainId);

    if (!module) {
      throw new NotFoundException(`Module with moduleId ${moduleId} is not supported`);
    }

    // We suppose if module in list, Keys API knows how to work with it
    // it is also important to have consistent module info and meta

    if (module.type == 'grouped-onchain-v1') {
      const meta = await this.registryService.getMetaDataFromStorage();
      const elBlockSnapshot = this.formELBlockSnapshot(meta);

      return {
        data: this.formSRModule(meta.keysOpIndex, module),
        elBlockSnapshot,
      };
    }
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

  private formELBlockSnapshot(meta: RegistryMeta): ELBlockSnapshot | null {
    if (!meta) {
      return null;
    }

    return {
      blockNumber: meta.blockNumber,
      blockHash: meta.blockHash,
      timestamp: meta.timestamp,
    };
  }
}
