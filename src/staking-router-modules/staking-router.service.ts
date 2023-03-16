import { Inject, Injectable } from '@nestjs/common';
import { LOGGER_PROVIDER, LoggerService } from 'common/logger';
import {
  KeyRegistryService,
  RegistryKeyStorageService,
  RegistryMetaStorageService,
  RegistryOperatorStorageService,
} from '@lido-nestjs/registry';
import { EntityManager } from '@mikro-orm/postgresql';
import { StakingModuleInterface, STAKING_MODULE_TYPE, ModuleId } from './interfaces';
import { CuratedModuleService } from './curated-module.service';
import { StakingModule } from 'common/contracts';

@Injectable()
export class StakingRouterService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,

    protected readonly keyRegistryService: KeyRegistryService,
    protected readonly keyStorageService: RegistryKeyStorageService,
    protected readonly metaStorageService: RegistryMetaStorageService,
    protected readonly operatorStorageService: RegistryOperatorStorageService,
    protected readonly entityManager: EntityManager,
  ) {}

  // Staking modules
  private curatedModule = new CuratedModuleService(
    this.keyRegistryService,
    this.keyStorageService,
    this.metaStorageService,
    this.operatorStorageService,
    this.entityManager,
  );

  // TODO: how to work with isActive false modules
  protected stakingModules: StakingModule[] = [];
  // TODO: no type check in this case. why?
  protected stakingModulesTooling: { stakingModule: StakingModule; tooling: StakingModuleInterface }[] = [];
  protected tooling = [{ type: STAKING_MODULE_TYPE.CURATED_ONCHAIN_V1_TYPE, tooling: this.curatedModule }];

  /**
   * Set staking router modules
   */
  public setStakingModules(modules: StakingModule[]): void {
    this.stakingModules = modules;
    this.stakingModulesTooling = modules.map((module) => {
      // undefined in tooling field is imposible as we check all modules types when fetch SR modules from contract
      return { stakingModule: module, tooling: this.tooling[module.type] };
    });
  }

  /**
   *
   * @returns Staking Module list without tooling
   */
  public getStakingModules(): StakingModule[] {
    return this.stakingModules;
  }

  /**
   * Staking Modules list with tooling
   * Can be used in for of cycle during update and in endpoints that capture info from all staking modules
   * @returns Staking modules with class instances. tooling value can be undefined if module is inactive and we dont know it is type
   */
  public getStakingModulesTooling(): { stakingModule: StakingModule; tooling: StakingModuleInterface }[] {
    return this.stakingModulesTooling;
  }

  /**
   *
   * @param moduleId id or contract address of Staking Module
   * @returns Staking module details.
   * Useful for endpoints that get information from specified staking module
   */
  public getStakingModule(moduleId: ModuleId): StakingModule | undefined {
    // here should be == as moduleId can be string and number
    return this.stakingModules.find((module) => module.stakingModuleAddress == moduleId || module.id == moduleId);
  }

  /**
   *
   * @param moduleId id or contract address of Staking Module
   * @returns Stakign module with tooling.
   */
  public getStakingModuleTooling(moduleId: ModuleId):
    | {
        stakingModule: StakingModule;
        tooling: StakingModuleInterface;
      }
    | undefined {
    return this.stakingModulesTooling.find(
      ({ stakingModule }) => stakingModule.stakingModuleAddress == moduleId || stakingModule.id == moduleId,
    );
  }

  // return undefined if empty list of staking modules
  public mainStakingModule(): { stakingModule: StakingModule; tooling: StakingModuleInterface } | undefined {
    return this.stakingModulesTooling[0];
  }
}
