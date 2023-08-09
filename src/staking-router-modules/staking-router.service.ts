import { EntityManager } from '@mikro-orm/knex';
import { Inject, Injectable, LoggerService, NotFoundException } from '@nestjs/common';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { ModuleRef } from '@nestjs/core';

import { StakingModuleInterface } from './interfaces/staking-module.interface';
import { httpExceptionTooEarlyResp } from 'http/common/entities/http-exceptions';
import { ELBlockSnapshot, ModuleId, SRModule } from 'http/common/entities';
import { config } from './staking-module-impl-config';
import { IsolationLevel } from '@mikro-orm/core';
import { SrModuleEntity } from 'storage/sr-module.entity';
import { SRModuleStorageService } from 'storage/sr-module.storage';
import { ElMetaStorageService } from 'storage/el-meta.storage';
import { ElMetaEntity } from 'storage/el-meta.entity';
import { isValidContractAddress } from './utils';

@Injectable()
export class StakingRouterService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    private readonly moduleRef: ModuleRef,
    protected readonly entityManager: EntityManager,
    protected readonly srModulesStorage: SRModuleStorageService,
    protected readonly elMetaStorage: ElMetaStorageService,
  ) {}

  /**
   * Method for reading staking modules from database
   * @returns Staking module list from database
   */
  public async getStakingModules(): Promise<SrModuleEntity[]> {
    const srModules = await this.srModulesStorage.findAll();
    return srModules;
  }

  /**
   * Method for reading staking module from database by module id
   * @param moduleId - id or address of staking module
   * @returns Staking module from database
   */
  public async getStakingModule(moduleId: ModuleId): Promise<SrModuleEntity | null> {
    if (isValidContractAddress(moduleId)) {
      return await this.srModulesStorage.findOneByContractAddress(moduleId);
    }

    if (Number(moduleId)) {
      return await this.srModulesStorage.findOneById(Number(moduleId));
    }

    return null;
  }

  public getStakingRouterModuleImpl(moduleType: string): StakingModuleInterface {
    const impl = config[moduleType];
    const moduleInstance = this.moduleRef.get<StakingModuleInterface>(impl);
    return moduleInstance;
  }

  /**
   * Execution layer meta that is stored in database
   */
  public async getElBlockSnapshot(): Promise<ElMetaEntity | null> {
    return await this.elMetaStorage.get();
  }

  /**
   * Helper method for getting staking module list and execution layer meta
   * @returns Staking modules list and execution layer meta
   */
  public async getStakingModulesAndMeta(): Promise<{
    stakingModules: SrModuleEntity[];
    elBlockSnapshot: ELBlockSnapshot;
  }> {
    const { stakingModules, elBlockSnapshot } = await this.entityManager.transactional(
      async () => {
        const stakingModules = await this.getStakingModules();

        if (stakingModules.length === 0) {
          this.logger.warn("No staking modules in list. Maybe didn't fetched from SR yet");
          throw httpExceptionTooEarlyResp();
        }

        const elBlockSnapshot = await this.getElBlockSnapshot();

        if (!elBlockSnapshot) {
          this.logger.warn("Meta is null, maybe data hasn't been written in db yet");
          throw httpExceptionTooEarlyResp();
        }

        return { stakingModules, elBlockSnapshot };
      },
      { isolationLevel: IsolationLevel.REPEATABLE_READ },
    );

    return { stakingModules, elBlockSnapshot: new ELBlockSnapshot(elBlockSnapshot) };
  }

  // for one module

  /**
   * Find in storage staking module and execution layer meta
   * @param moduleId id or contract address of staking module contract
   * @returns staking module from database and execution layer meta
   */
  public async getStakingModuleAndMeta(
    moduleId: ModuleId,
  ): Promise<{ module: SRModule; elBlockSnapshot: ELBlockSnapshot }> {
    const { stakingModule, elBlockSnapshot } = await this.entityManager.transactional(
      async () => {
        const stakingModule = await this.getStakingModule(moduleId);
        if (!stakingModule) {
          throw new NotFoundException(`Module with moduleId ${moduleId} is not supported`);
        }

        const elBlockSnapshot = await this.getElBlockSnapshot();

        if (!elBlockSnapshot) {
          this.logger.warn(`Meta is null, maybe data hasn't been written in db yet.`);
          throw httpExceptionTooEarlyResp();
        }

        return { stakingModule, elBlockSnapshot };
      },
      { isolationLevel: IsolationLevel.REPEATABLE_READ },
    );

    // TODO: in this module sometime we return module from db as it is , sometime use SRModule from http/entities. need to choose how we will do it
    return { module: new SRModule(stakingModule), elBlockSnapshot: new ELBlockSnapshot(elBlockSnapshot) };
  }
}
