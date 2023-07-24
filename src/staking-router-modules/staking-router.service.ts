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
import { ElMetaStorageService } from 'storage/el-meta.storage';
import { ElMetaEntity } from 'storage/el-meta.entity';

@Injectable()
export class StakingRouterService {
  constructor(
    private readonly moduleRef: ModuleRef,
    protected readonly stakingRouterFetchService: StakingRouterFetchService,
    protected readonly executionProvider: ExecutionProviderService,
    protected readonly entityManager: EntityManager,
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected readonly srModulesStorage: SRModuleStorageService,
    protected readonly elMetaStorage: ElMetaStorageService,
  ) {}

  // modules list is used in endpoints
  public async getStakingModules(): Promise<SRModuleEntity[]> {
    const srModules = await this.srModulesStorage.findAll();
    return srModules;
  }

  public async getStakingModule(moduleId: ModuleId): Promise<SRModuleEntity | null> {
    // TODO: here should be more checks
    if (typeof moduleId === 'number') {
      return await this.srModulesStorage.findOneById(moduleId);
    }

    return await this.srModulesStorage.findOneByContractAddress(moduleId);
  }

  // update keys of all modules
  public async update(): Promise<void> {
    // reading latest block from blockchain
    const currElMeta = await this.executionProvider.getBlock('latest');
    // read from database last execution layer data
    const prevElMeta = await this.elMetaStorage.get();

    if (prevElMeta && prevElMeta?.blockNumber > currElMeta.number) {
      this.logger.warn('Previous data is newer than current data');
      return;
    }

    // get staking router modules from SR contract
    const modules = await this.stakingRouterFetchService.getStakingModules({ blockHash: currElMeta.hash });

    //TODO: will transaction and rollback work
    await this.entityManager.transactional(
      async () => {
        // Update el meta in db
        await this.entityManager.nativeDelete(ElMetaEntity, {});
        await this.entityManager.persist(
          new ElMetaEntity({
            blockHash: currElMeta.hash,
            blockNumber: currElMeta.number,
            timestamp: currElMeta.timestamp,
          }),
        );

        for (const module of modules) {
          // read from config name of module that implement functions to fetch and store keys for type
          // TODO: check what will happen if implementation is not a provider of StakingRouterModule
          const impl = config[module.type];
          const moduleInstance = this.moduleRef.get<StakingModuleInterface>(impl);

          // At the moment lets think that for all modules it is possible to make decision base on nonce value

          const currNonce = await moduleInstance.getCurrentNonce(currElMeta.hash);
          const moduleInStorage = await this.srModulesStorage.findOneById(module.id);

          if (moduleInStorage && moduleInStorage.nonce == currNonce) {
            // nothing changed, don't need to update
            return;
          }

          // TODO: move to SRModuleEntity storage module
          await this.srModulesStorage.store(module, currNonce);
          // here we already sure that we need to update keys and operators
          // TODO: next step is removing meta and nonce checking from updateKeys algo in registry implementation
          // TODO: rename updateKeys -> update (as we update operators, meta and keys)
          await moduleInstance.updateKeys(currElMeta.hash);
        }
      },
      { isolationLevel: IsolationLevel.READ_COMMITTED },
    );
  }

  // this method we will use to return meta in endpoints for all modules
  // as data collected for all modules for the same state
  public async getElBlockSnapshot(): Promise<ElMetaEntity | null> {
    return await this.elMetaStorage.get();
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
