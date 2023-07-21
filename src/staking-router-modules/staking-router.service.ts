import { EntityManager } from '@mikro-orm/knex';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { ModuleRef } from '@nestjs/core';
import { StakingRouterFetchService } from 'common/contracts';
import { ExecutionProviderService } from 'common/execution-provider';
import { KeysFilter } from './interfaces/keys-filter';
import { StakingModuleInterface } from './interfaces/staking-module.interface';
import { httpExceptionTooEarlyResp } from 'http/common/entities/http-exceptions';
import { KeyWithModuleAddress } from 'http/keys/entities';
import { ELBlockSnapshot, ModuleId } from 'http/common/entities';
import { config } from './staking-module-impl-config';
import { IsolationLevel } from '@mikro-orm/core';
import { SRModuleEntity } from 'storage/sr-module.entity';
import { SRModuleStorageService } from 'storage/sr-module.storage';

@Injectable()
export class StakingRouterService {
  constructor(
    private readonly moduleRef: ModuleRef,
    protected readonly stakingRouterFetchService: StakingRouterFetchService,
    protected readonly executionProvider: ExecutionProviderService,
    protected readonly entityManager: EntityManager,
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected readonly srModulesStorage: SRModuleStorageService,
  ) {}

  // modules list is used in endpoints
  public async getStakingModules(): Promise<SRModuleEntity[]> {
    const srModules = await this.srModulesStorage.findAll();
    return srModules;
  }

  public async getStakingModule(moduleId: ModuleId): Promise<SRModuleEntity | null> {
    if (typeof moduleId === 'number') {
      return await this.srModulesStorage.findOneById(moduleId);
    }

    return await this.srModulesStorage.findOneByContractAddress(moduleId);
  }

  // update keys of all modules
  public async update(): Promise<void> {
    // read list of modules
    // start updating by block hash
    // get blockHash for 'latest' block
    const blockHash = await this.executionProvider.getBlockHash('latest');
    // read from db

    // get staking router modules
    const modules = await this.stakingRouterFetchService.getStakingModules({ blockHash: blockHash });

    //TODO: will transaction and rollback work
    await this.entityManager.transactional(
      async () => {
        for (const module of modules) {
          // on the next iteration form EL data here and write in DB

          const impl = config[module.type];
          const moduleInstance = this.moduleRef.get<StakingModuleInterface>(impl);
          // TODO: rename updateKeys -> update (as we update operators, meta and keys)

          // will move decision about update on upper layer
          // read here a nonce for module
          // but it can be not like this for other implementation

          await moduleInstance.updateKeys(blockHash);
          const meta = await moduleInstance.getMetaDataFromStorage();

          // if meta is null it means we cant work and update modules list
          // and we should not update modules' data

          if (!meta) {
            this.logger.error("Can't update data in database, meta is null");
            throw new Error("Can't update data in database, meta is null");
          }

          // on this iteration will read nonce from meta and write in module
          const srModule = new SRModuleEntity(module, meta.keysOpIndex);

          await this.entityManager
            .createQueryBuilder(SRModuleEntity)
            .insert(srModule)
            .onConflict(['id', 'staking_module_address'])
            .merge()
            .execute();
        }
      },
      { isolationLevel: IsolationLevel.READ_COMMITTED },
    );
  }

  // this method we will use to return meta in endpoints
  public async getElBlockSnapshot(): Promise<void> {
    return;
  }

  public async getKeys(filters: KeysFilter): Promise<{
    data: KeyWithModuleAddress[];
    meta: {
      elBlockSnapshot: ELBlockSnapshot;
    };
  }> {
    const stakingModules = await this.getStakingModules();

    if (stakingModules.length === 0) {
      this.logger.warn("No staking modules in list. Maybe didn't fetched from SR yet");
      throw httpExceptionTooEarlyResp();
    }

    // we need to fetch keys from storage for all modules for the same block hash
    // TODO: will transaction and rollback work
    const { keys, elBlockSnapshot } = await this.entityManager.transactional(async () => {
      const collectedKeys: KeyWithModuleAddress[][] = [];
      let elBlockSnapshot: ELBlockSnapshot | null = null;

      for (const module of stakingModules) {
        const impl = config[module.type];
        const moduleInstance = this.moduleRef.get<StakingModuleInterface>(impl);
        const { keys, meta } = await moduleInstance.getKeysWithMeta(filters);

        if (!meta) {
          this.logger.warn(`Meta is null, maybe data hasn't been written in db yet.`);
          throw httpExceptionTooEarlyResp();
        }

        // KAPI always return data for the last state that is saved in db and store modules data for the same block hash
        // We know that we will save keys of modules with different impl in different tables
        // so possibly we will save meta also in different tables
        // so to return state of KAPI lets use first module in list, blockNumber blockHash  timestamp will be the same for all modules
        // TODO: consider split el meta and staking module meta. first one will be common for all staking modules
        // now we need to read el meta common for all modules. lets use first module for it
        // if (module.id == this.stakingModules[0]?.id) {

        elBlockSnapshot = new ELBlockSnapshot(meta);
        // }

        // todo: remove when add address to table
        const keysWithAddress: KeyWithModuleAddress[] = keys.map(
          (key) => new KeyWithModuleAddress(key, module.stakingModuleAddress),
        );

        collectedKeys.push(keysWithAddress);
      }

      return { keys: collectedKeys, elBlockSnapshot };
    });

    if (!elBlockSnapshot) {
      this.logger.warn("Meta for response wasn't set.");
      throw httpExceptionTooEarlyResp();
    }

    return {
      data: keys.flat(),
      meta: {
        elBlockSnapshot,
      },
    };
  }

  public getKeysByModules(filters: KeysFilter): void {
    return;
  }

  public getModuleKeys(moduleId: ModuleId, filters: KeysFilter): void {
    return;
  }

  public getOperators(): void {
    return;
  }

  public getModuleOperators(moduleId: ModuleId): void {
    return;
  }

  public getModuleOperator(moduleId: ModuleId, operatorIndex: number): void {
    return;
  }
}
