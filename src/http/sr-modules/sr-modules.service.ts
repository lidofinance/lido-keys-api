import { Inject, Injectable, NotFoundException, LoggerService } from '@nestjs/common';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { ConfigService, CURATED_ONCHAIN_V1_TYPE } from 'common/config';
import { SRModuleResponse, SRModuleListResponse } from './entities';
import { RegistryService } from 'jobs/registry.service';
import { ELBlockSnapshot, SRModule } from 'http/common/entities';
import { ModuleId } from 'http/common/entities/';
import { getSRModule, getSRModuleByType } from 'http/common/sr-modules.utils';

@Injectable()
export class SRModulesService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected configService: ConfigService,
    protected registryService: RegistryService,
  ) {}

  async getModules(): Promise<SRModuleListResponse> {
    // Currently modules information is fixed in json
    // at the moment api support only NodeOperatorsRegistry contract
    // so we form here list only from infomation of this contract
    // than we will get information from SR contract
    // it is also important to have consistent module info and meta

    const chainId = this.configService.get('CHAIN_ID');

    const moduleType = CURATED_ONCHAIN_V1_TYPE;
    const curatedModule = getSRModuleByType(moduleType, chainId);

    if (!curatedModule) {
      throw new NotFoundException(`Module with type ${moduleType} not found`);
    }

    const meta = await this.registryService.getMetaDataFromStorage();

    if (!meta) {
      this.logger.warn(`Meta is null, maybe data hasn't been written in db yet.`);
      return {
        data: [],
        elBlockSnapshot: null,
      };
    }

    const elBlockSnapshot = new ELBlockSnapshot(meta);

    return {
      data: [new SRModule(meta.keysOpIndex, curatedModule)],
      elBlockSnapshot,
    };
  }

  async getModule(moduleId: ModuleId): Promise<SRModuleResponse> {
    // At first, we should find module by id in our list, in future without chainId
    const chainId = this.configService.get('CHAIN_ID');
    const module = getSRModule(moduleId, chainId);

    if (!module) {
      throw new NotFoundException(`Module with moduleId ${moduleId} is not supported`);
    }

    // We suppose if module in list, Keys API knows how to work with it
    // it is also important to have consistent module info and meta

    if (module.type === CURATED_ONCHAIN_V1_TYPE) {
      const meta = await this.registryService.getMetaDataFromStorage();

      if (!meta) {
        this.logger.warn(`Meta is null, maybe data hasn't been written in db yet.`);
        return {
          data: null,
          elBlockSnapshot: null,
        };
      }

      const elBlockSnapshot = new ELBlockSnapshot(meta);

      return {
        data: new SRModule(meta.keysOpIndex, module),
        elBlockSnapshot,
      };
    }

    throw new NotFoundException(`Modules with other types are not supported`);
  }
}
