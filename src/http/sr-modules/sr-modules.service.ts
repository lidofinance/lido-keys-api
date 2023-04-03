import { Inject, Injectable, NotFoundException, LoggerService } from '@nestjs/common';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { ConfigService } from 'common/config';
import { SRModuleResponse, SRModuleListResponse } from './entities';
import { ELBlockSnapshot, SRModule } from 'http/common/entities';
import { ModuleId } from 'http/common/entities/';
import { CuratedModuleService, STAKING_MODULE_TYPE } from 'staking-router-modules';
import { KeysUpdateService } from 'jobs/keys-update';
import { httpExceptionTooEarlyResp } from 'http/common/entities/http-exceptions/too-early-resp';

@Injectable()
export class SRModulesService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected configService: ConfigService,
    protected curatedService: CuratedModuleService,
    protected keysUpdateService: KeysUpdateService,
  ) {}

  async getModules(): Promise<SRModuleListResponse> {
    const stakingModules = await this.keysUpdateService.getStakingModules();

    if (stakingModules.length == 0) {
      this.logger.warn('No staking modules in list. Maybe didnt fetched from SR yet');
      throw httpExceptionTooEarlyResp();
    }

    const srModulesWithNonce: SRModule[] = [];
    let elBlockSnapshot: ELBlockSnapshot | null = null;

    for (let i = 0; i < stakingModules.length; i++) {
      if (stakingModules[i].type == STAKING_MODULE_TYPE.CURATED_ONCHAIN_V1_TYPE) {
        const meta = await this.curatedService.getMetaDataFromStorage();
        if (!meta) {
          this.logger.warn(`Meta is null, maybe data hasn't been written in db yet.`);
          throw httpExceptionTooEarlyResp();
        }

        srModulesWithNonce.push(new SRModule(meta.keysOpIndex, stakingModules[i]));

        // meta should be the same for all modules
        // so in answer we can use meta of any module
        // lets use meta of first module in list
        // currently we sure if stakingModules is not empty, we will have in list Curated Module
        // in future this check should be in each if clause
        if (i == 0) {
          elBlockSnapshot = new ELBlockSnapshot(meta);
        }
      }
    }

    // we check stakingModules list types so this condition should never be true
    if (!elBlockSnapshot) {
      this.logger.warn(`Meta for response wasnt set.`);
      throw httpExceptionTooEarlyResp();
    }

    return {
      data: srModulesWithNonce,
      elBlockSnapshot,
    };
  }

  async getModule(moduleId: ModuleId): Promise<SRModuleResponse> {
    const stakingModule = await this.keysUpdateService.getStakingModule(moduleId);

    if (!stakingModule) {
      throw new NotFoundException(`Module with moduleId ${moduleId} is not supported`);
    }

    // We suppose if module in list, Keys API knows how to work with it
    // it is also important to have consistent module info and meta

    if (stakingModule.type === STAKING_MODULE_TYPE.CURATED_ONCHAIN_V1_TYPE) {
      const meta = await this.curatedService.getMetaDataFromStorage();

      if (!meta) {
        this.logger.warn(`Meta is null, maybe data hasn't been written in db yet.`);
        throw httpExceptionTooEarlyResp();
      }

      const elBlockSnapshot = new ELBlockSnapshot(meta);

      return {
        data: new SRModule(meta.keysOpIndex, stakingModule),
        elBlockSnapshot,
      };
    }

    throw new NotFoundException(`Modules with other types are not supported`);
  }
}
