import { EntityManager } from '@mikro-orm/knex';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { ModuleRef } from '@nestjs/core';
import { StakingRouterFetchService } from 'common/contracts';
import { ExecutionProviderService } from 'common/execution-provider';
import { CuratedModuleService } from './curated-module.service';
import { KeysFilter } from './interfaces/keys-filter';
import { StakingModule } from './interfaces/staking-module';
import { STAKING_MODULE_TYPE } from './interfaces/staking-module-type';
import { StakingModuleInterface } from './interfaces/staking-module.interface';
import { httpExceptionTooEarlyResp } from 'http/common/entities/http-exceptions';
import { KeyWithModuleAddress } from 'http/keys/entities';
import { ELBlockSnapshot, ModuleId } from 'http/common/entities';

type StakingModuleImpl = typeof CuratedModuleService;

export const config: // = {
Record<STAKING_MODULE_TYPE, StakingModuleImpl> = {
  [STAKING_MODULE_TYPE.CURATED_ONCHAIN_V1_TYPE]: CuratedModuleService,
  // In future will be added dvt staking module with the same implementation
  // now kapi will now correctly work with it as module contract address is hardcoded
  // [STAKING_MODULE_TYPE.DVT_ONCHAIN_V1_TYPE]: CuratedModuleService,
};

@Injectable()
export class StakingRouterService {
  constructor(
    private readonly moduleRef: ModuleRef,
    protected readonly stakingRouterFetchService: StakingRouterFetchService,
    protected readonly executionProvider: ExecutionProviderService,
    protected readonly entityManager: EntityManager,
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
  ) {}
  // list of staking modules
  // modules list is used in endpoints
  // TODO: move this list in staking-router-modules folder
  protected stakingModules: StakingModule[] = [];

  public getStakingModules() {
    return this.stakingModules;
  }

  // update keys of all modules
  public async update(): Promise<void> {
    // read list of modules
    // start updating by block hash

    // get blockHash for 'latest' block
    const blockHash = await this.executionProvider.getBlockHash('latest');

    // get staking router modules
    const modules = await this.stakingRouterFetchService.getStakingModules({ blockHash: blockHash });
    this.stakingModules = modules;

    // TODO: will transaction and rollback work
    await this.entityManager.transactional(async () => {
      for (const module of modules) {
        const impl = config[module.type];
        const moduleInstance = this.moduleRef.get<StakingModuleInterface>(impl);
        await moduleInstance.updateKeys(blockHash);

        throw httpExceptionTooEarlyResp();
      }
    });
  }

  public async getKeys(filters: KeysFilter): Promise<{
    data: KeyWithModuleAddress[];
    meta: {
      elBlockSnapshot: ELBlockSnapshot;
    };
  }> {
    if (this.stakingModules.length === 0) {
      this.logger.warn("No staking modules in list. Maybe didn't fetched from SR yet");
      throw httpExceptionTooEarlyResp();
    }

    // we need to fetch keys from storage for all modules for the same block hash
    // TODO: will transaction and rollback work
    const { keys, elBlockSnapshot } = await this.entityManager.transactional(async () => {
      const collectedKeys: KeyWithModuleAddress[][] = [];
      let elBlockSnapshot: ELBlockSnapshot | null = null;
      for (const module of this.stakingModules) {
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
