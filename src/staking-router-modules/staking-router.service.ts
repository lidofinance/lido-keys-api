import { EntityManager } from '@mikro-orm/knex';
import { Inject, Injectable, InternalServerErrorException, LoggerService, NotFoundException } from '@nestjs/common';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { ModuleRef } from '@nestjs/core';
import { StakingRouterFetchService } from 'common/contracts';
import { ExecutionProviderService } from 'common/execution-provider';
import { KeysFilter } from './interfaces/keys-filter';
import { KeyEntity, OperatorEntity, StakingModuleInterface } from './interfaces/staking-module.interface';
import { httpExceptionTooEarlyResp } from 'http/common/entities/http-exceptions';
import { KeyWithModuleAddress } from 'http/keys/entities';
import { ELBlockSnapshot, Key, ModuleId, SRModule } from 'http/common/entities';
import { config } from './staking-module-impl-config';
import { IsolationLevel } from '@mikro-orm/core';
import { SrModuleEntity } from 'storage/sr-module.entity';
import { SRModuleStorageService } from 'storage/sr-module.storage';
import { ElMetaStorageService } from 'storage/el-meta.storage';
import { ElMetaEntity } from 'storage/el-meta.entity';
import { GroupedByModuleKeyListResponse, SRModuleKeyListResponse } from 'http/sr-modules-keys/entities';
import {
  GroupedByModuleOperatorListResponse,
  SRModuleOperatorListResponse,
  SRModuleOperatorResponse,
} from 'http/sr-modules-operators/entities';
import { SRModuleOperator } from 'http/common/entities/sr-module-operator';
import { SRModuleOperatorsKeysResponse } from 'http/sr-modules-operators-keys/entities';
import { isValidContractAddress } from './utils';
import { ValidatorsQuery } from 'http/sr-modules-validators/entities';
import { ConsensusMeta, Validator } from '@lido-nestjs/validators-registry';
import {
  DEFAULT_EXIT_PERCENT,
  VALIDATORS_STATUSES_FOR_EXIT,
  VALIDATORS_REGISTRY_DISABLED_ERROR,
} from 'validators/validators.constants';
import { ValidatorsService } from 'validators';
import { CuratedModuleService } from './curated-module.service';

@Injectable()
export class StakingRouterService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    private readonly moduleRef: ModuleRef,
    protected readonly stakingRouterFetchService: StakingRouterFetchService,
    protected readonly executionProvider: ExecutionProviderService,
    protected readonly entityManager: EntityManager,
    protected readonly srModulesStorage: SRModuleStorageService,
    protected readonly elMetaStorage: ElMetaStorageService,
    protected readonly validatorsService: ValidatorsService,
    protected readonly curatedService: CuratedModuleService,
  ) {}

  // TODO: maybe add method to read modules and meta together

  // modules list is used in endpoints
  public async getStakingModules(): Promise<SrModuleEntity[]> {
    const srModules = await this.srModulesStorage.findAll();
    return srModules;
  }

  public async getStakingModule(moduleId: ModuleId): Promise<SrModuleEntity | null> {
    if (isValidContractAddress(moduleId)) {
      return await this.srModulesStorage.findOneByContractAddress(moduleId);
    }

    return await this.srModulesStorage.findOneById(Number(moduleId));
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

    // TODO: еcли была реорганизация, может ли currElMeta.number быть меньше и нам надо обновиться ?

    // get staking router modules from SR contract
    const modules = await this.stakingRouterFetchService.getStakingModules({ blockHash: currElMeta.hash });

    // TODO: is it correct that i use here modules from blockchain instead of storage

    //TODO: will transaction and rollback work
    await this.entityManager.transactional(
      async () => {
        // Update el meta in db
        await this.elMetaStorage.update(currElMeta);

        for (const module of modules) {
          // read from config name of module that implement functions to fetch and store keys for type
          // TODO: check what will happen if implementation is not a provider of StakingRouterModule
          const impl = config[module.type];
          const moduleInstance = this.moduleRef.get<StakingModuleInterface>(impl);

          // At the moment lets think that for all modules it is possible to make decision base on nonce value

          const currNonce = await moduleInstance.getCurrentNonce(currElMeta.hash, module.stakingModuleAddress);
          const moduleInStorage = await this.srModulesStorage.findOneById(module.id);

          // now updating decision should be here moduleInstance.updateKeys
          if (moduleInStorage && moduleInStorage.nonce === currNonce) {
            // nothing changed, don't need to update
            // TODO: add log
            return;
          }

          // TODO: move to SrModuleEntity storage module
          await this.srModulesStorage.store(module, currNonce);
          // here we already sure that we need to update keys and operators
          // TODO: next step is removing meta and nonce checking from updateKeys algo in registry implementation
          // TODO: rename updateKeys -> update (as we update operators, meta and keys)
          await moduleInstance.update(currElMeta.hash, module.stakingModuleAddress);
        }
      },
      { isolationLevel: IsolationLevel.READ_COMMITTED },
    );
  }

  // this method we will use to return meta in endpoints for all modules
  // as data collected for all modules for the same state
  // TODO: start using in endpoints
  public async getElBlockSnapshot(): Promise<ElMetaEntity | null> {
    return await this.elMetaStorage.get();
  }

  public async getKeysStream(filters: KeysFilter) {
    const stakingModules = await this.getStakingModules();

    if (stakingModules.length === 0) {
      this.logger.warn("No staking modules in list. Maybe didn't fetched from SR yet");
      // TODO: should we throw here exception, or enough to return empty list?
      throw httpExceptionTooEarlyResp();
    }

    const keysGeneratorsByModules: any[] = [];

    for (const module of stakingModules) {
      const impl = config[module.type];
      const moduleInstance = this.moduleRef.get<StakingModuleInterface>(impl);

      // TODO: add type to function
      // TODO: should add options {
      //   populated: ['key', 'deposit_signature', 'operator_index', 'used', 'module_address'],
      // }
      const res = await moduleInstance.getKeysStream(filters, module.stakingModuleAddress);

      keysGeneratorsByModules.push(res);
    }

    return keysGeneratorsByModules;
  }

  // TODO: should be deprecated
  public async getKeys(filters: KeysFilter): Promise<{
    data: KeyWithModuleAddress[];
    meta: {
      elBlockSnapshot: ELBlockSnapshot;
    };
  }> {
    const { keys, elMeta } = await this.entityManager.transactional(
      async () => {
        // get list of modules
        const stakingModules = await this.getStakingModules();

        if (stakingModules.length === 0) {
          this.logger.warn("No staking modules in list. Maybe didn't fetched from SR yet");
          // TODO: should we throw here exception, or enough to return empty list?
          throw httpExceptionTooEarlyResp();
        }

        const elMeta = await this.getElBlockSnapshot();

        if (!elMeta) {
          this.logger.warn(`Meta is null, maybe data hasn't been written in db yet.`);
          throw httpExceptionTooEarlyResp();
        }

        const collectedKeys: KeyWithModuleAddress[][] = [];

        for (const module of stakingModules) {
          // read from config name of module that implement functions to fetch and store keys for type
          // TODO: check what will happen if implementation is not a provider of StakingRouterModule
          const impl = config[module.type];
          const moduleInstance = this.moduleRef.get<StakingModuleInterface>(impl);
          // TODO: use here method with streams
          // TODO: add in select fields
          // all keys should be returned with the same fields

          // this method of modules with  StakingModuleInterface interface has common type of key
          // /v1/keys return these common fields for all modules
          // here should be request without module.stakingModuleAddress
          const keys = await moduleInstance.getKeys(filters, module.stakingModuleAddress, {
            populated: ['key', 'deposit_signature', 'operator_index', 'used', 'module_address'],
          });

          collectedKeys.push(keys);
        }

        return { keys: collectedKeys.flat(), elMeta };
      },
      { isolationLevel: IsolationLevel.READ_COMMITTED },
    );

    return {
      data: keys,
      meta: {
        elBlockSnapshot: new ELBlockSnapshot(elMeta),
      },
    };
  }

  // TODO: Should we add streams for fetching keys by pubkeys ?
  // this edpoint doesnt return a big answer
  public async getKeysByPubKeys(pubKeys: string[]): Promise<{
    data: KeyWithModuleAddress[];
    meta: {
      elBlockSnapshot: ELBlockSnapshot;
    };
  }> {
    const { keys, elMeta } = await this.entityManager.transactional(
      async () => {
        // get list of modules
        const stakingModules = await this.getStakingModules();

        if (stakingModules.length === 0) {
          this.logger.warn("No staking modules in list. Maybe didn't fetched from SR yet");
          // TODO: should we throw here exception, or enough to return empty list?
          throw httpExceptionTooEarlyResp();
        }

        const elMeta = await this.getElBlockSnapshot();

        if (!elMeta) {
          this.logger.warn(`Meta is null, maybe data hasn't been written in db yet.`);
          throw httpExceptionTooEarlyResp();
        }

        const collectedKeys: KeyWithModuleAddress[][] = [];

        for (const module of stakingModules) {
          // read from config name of module that implement functions to fetch and store keys for type
          // TODO: check what will happen if implementation is not a provider of StakingRouterModule
          const impl = config[module.type];
          const moduleInstance = this.moduleRef.get<StakingModuleInterface>(impl);
          // TODO: use here method with streams
          // TODO: add in select fields
          // all keys should be returned with the same fields

          // this method of modules with  StakingModuleInterface interface has common type of key
          // //v1/keys/find return these common fields for all modules
          const keys = await moduleInstance.getKeysByPubKeys(pubKeys, module.stakingModuleAddress, {
            populated: ['key', 'deposit_signature', 'operator_index', 'used', 'module_address'],
          });

          collectedKeys.push(keys);
        }

        return { keys: collectedKeys.flat(), elMeta };
      },
      { isolationLevel: IsolationLevel.READ_COMMITTED },
    );

    return {
      data: keys,
      meta: {
        elBlockSnapshot: new ELBlockSnapshot(elMeta),
      },
    };
  }

  // TODO: Should we add streams for fetching keys by pubkeys ?
  // this edpoint doesnt return a big answer
  public async getKeysByPubkey(pubkey: string): Promise<{
    data: KeyWithModuleAddress[];
    meta: {
      elBlockSnapshot: ELBlockSnapshot;
    };
  }> {
    const { keys, elMeta } = await this.entityManager.transactional(
      async () => {
        // get list of modules
        const stakingModules = await this.getStakingModules();

        if (stakingModules.length === 0) {
          this.logger.warn("No staking modules in list. Maybe didn't fetched from SR yet");
          // TODO: should we throw here exception, or enough to return empty list?
          throw httpExceptionTooEarlyResp();
        }

        const elMeta = await this.getElBlockSnapshot();

        if (!elMeta) {
          this.logger.warn(`Meta is null, maybe data hasn't been written in db yet.`);
          throw httpExceptionTooEarlyResp();
        }

        const collectedKeys: KeyWithModuleAddress[][] = [];

        for (const module of stakingModules) {
          // read from config name of module that implement functions to fetch and store keys for type
          // TODO: check what will happen if implementation is not a provider of StakingRouterModule
          const impl = config[module.type];
          const moduleInstance = this.moduleRef.get<StakingModuleInterface>(impl);
          // TODO: use here method with streams
          // TODO: add in select fields
          // all keys should be returned with the same fields

          // this method of modules with  StakingModuleInterface interface has common type of key
          // //v1/keys/find return these common fields for all modules
          const keys = await moduleInstance.getKeysByPubkey(pubkey, module.stakingModuleAddress, {
            populated: ['key', 'deposit_signature', 'operator_index', 'used', 'module_address'],
          });

          collectedKeys.push(keys);
        }

        return { keys: collectedKeys.flat(), elMeta };
      },
      { isolationLevel: IsolationLevel.READ_COMMITTED },
    );

    return {
      data: keys,
      meta: {
        elBlockSnapshot: new ELBlockSnapshot(elMeta),
      },
    };
  }

  public async getKeysByModulesStreamVersion(filters: KeysFilter) {
    //: Promise<GroupedByModuleKeyListResponse> {
    // get list of modules
    const stakingModules = await this.getStakingModules();

    if (stakingModules.length === 0) {
      this.logger.warn("No staking modules in list. Maybe didn't fetched from SR yet");
      // TODO: should we throw here exception, or enough to return empty list?
      throw httpExceptionTooEarlyResp();
    }

    const elMeta = await this.getElBlockSnapshot();

    if (!elMeta) {
      this.logger.warn(`Meta is null, maybe data hasn't been written in db yet.`);
      throw httpExceptionTooEarlyResp();
    }

    // TODO: add type
    const keysGeneratorsByModules: { keysGenerator: any; module: SRModule }[] = [];

    for (const module of stakingModules) {
      // read from config name of module that implement functions to fetch and store keys for type
      // TODO: check what will happen if implementation is not a provider of StakingRouterModule
      const impl = config[module.type];
      const moduleInstance = this.moduleRef.get<StakingModuleInterface>(impl);
      // TODO: use here method with streams
      // TODO: add in select fields

      // TODO: define type for lsi of fields
      // /v1/modules/keys return these common fields for all modules without address
      const keysGenerator: any = await moduleInstance.getKeysStream(filters, module.stakingModuleAddress);

      // TODO: above use options
      //   {
      //   populated: ['key', 'deposit_signature', 'operator_index', 'used'],
      // });

      keysGeneratorsByModules.push({ keysGenerator, module: new SRModule(module) });
    }

    // TODO: maybe we need to read meta on the upper layer in controller's service

    return {
      keysGeneratorsByModules,
      meta: {
        elBlockSnapshot: new ELBlockSnapshot(elMeta),
      },
    };
  }

  // should be deprecated
  public async getKeysByModules(filters: KeysFilter): Promise<GroupedByModuleKeyListResponse> {
    const { keysByModules, elMeta } = await this.entityManager.transactional(
      async () => {
        // get list of modules
        const stakingModules = await this.getStakingModules();

        if (stakingModules.length === 0) {
          this.logger.warn("No staking modules in list. Maybe didn't fetched from SR yet");
          // TODO: should we throw here exception, or enough to return empty list?
          throw httpExceptionTooEarlyResp();
        }

        const elMeta = await this.getElBlockSnapshot();

        if (!elMeta) {
          this.logger.warn(`Meta is null, maybe data hasn't been written in db yet.`);
          throw httpExceptionTooEarlyResp();
        }

        const keysByModules: { keys: Key[]; module: SRModule }[] = [];

        for (const module of stakingModules) {
          // read from config name of module that implement functions to fetch and store keys for type
          // TODO: check what will happen if implementation is not a provider of StakingRouterModule
          const impl = config[module.type];
          const moduleInstance = this.moduleRef.get<StakingModuleInterface>(impl);
          // TODO: use here method with streams
          // TODO: add in select fields

          // TODO: define type for lsi of fields
          // /v1/modules/keys return these common fields for all modules without address
          const keys: Key[] = await moduleInstance.getKeys(filters, module.stakingModuleAddress, {
            populated: ['key', 'deposit_signature', 'operator_index', 'used'],
          });

          keysByModules.push({ keys, module: new SRModule(module) });
        }

        return { keysByModules, elMeta };
      },
      { isolationLevel: IsolationLevel.READ_COMMITTED },
    );

    return {
      data: keysByModules,
      meta: {
        elBlockSnapshot: new ELBlockSnapshot(elMeta),
      },
    };
  }

  // for one module

  // TODO: write type
  public async getModuleKeysStreamVersion(moduleId: ModuleId, filters: KeysFilter) {
    // /v1/modules/{moduleId}/keys returning type depends on module

    // so const moduleInstance = this.moduleRef.get<StakingModuleInterface>(impl);
    // moduleInstance.getKeys() should return all fields of key for module
    // check /v1/modules/{module_id}/keys

    // get module
    const stakingModule = await this.getStakingModule(moduleId);

    // maybe  this exception should not be sent here
    if (!stakingModule) {
      throw new NotFoundException(`Module with moduleId ${moduleId} is not supported`);
    }

    const elMeta = await this.getElBlockSnapshot();

    if (!elMeta) {
      this.logger.warn(`Meta is null, maybe data hasn't been written in db yet.`);
      throw httpExceptionTooEarlyResp();
    }

    const impl = config[stakingModule.type];
    const moduleInstance = this.moduleRef.get<StakingModuleInterface>(impl);
    // TODO: use here method with streams
    // TODO: add in select fields

    // TODO: define type for lsi of fields
    // /v1/modules/keys return these common fields for all modules without address
    const keysGenerator: any = await moduleInstance.getKeysStream(filters, stakingModule.stakingModuleAddress);
    const module = new SRModule(stakingModule);

    // TODO: maybe we need to read meta on the upper layer in controller's service

    return {
      keysGenerator,
      module,
      meta: {
        elBlockSnapshot: new ELBlockSnapshot(elMeta),
      },
    };
  }

  // should be deprecated
  // TODO: consider use different type
  public async getModuleKeys(moduleId: ModuleId, filters: KeysFilter): Promise<SRModuleKeyListResponse> {
    // /v1/modules/{moduleId}/keys returning type depends on module

    // so const moduleInstance = this.moduleRef.get<StakingModuleInterface>(impl);
    // moduleInstance.getKeys() should return all fields of key for module
    // check /v1/modules/{module_id}/keys

    const { keys, module, elMeta } = await this.entityManager.transactional(
      async () => {
        // get module
        const stakingModule = await this.getStakingModule(moduleId);

        // maybe  this exception should not be sent here
        if (!stakingModule) {
          throw new NotFoundException(`Module with moduleId ${moduleId} is not supported`);
        }

        const elMeta = await this.getElBlockSnapshot();

        if (!elMeta) {
          this.logger.warn(`Meta is null, maybe data hasn't been written in db yet.`);
          throw httpExceptionTooEarlyResp();
        }

        const impl = config[stakingModule.type];
        const moduleInstance = this.moduleRef.get<StakingModuleInterface>(impl);
        // TODO: use here method with streams
        // TODO: add in select fields

        // TODO: define type for lsi of fields
        // /v1/modules/keys return these common fields for all modules without address
        const keys: KeyEntity[] = await moduleInstance.getKeys(filters, stakingModule.stakingModuleAddress);
        const module = new SRModule(stakingModule);

        return { keys, module, elMeta };
      },
      { isolationLevel: IsolationLevel.READ_COMMITTED },
    );

    return {
      data: { keys, module },
      meta: {
        elBlockSnapshot: new ELBlockSnapshot(elMeta),
      },
    };
  }

  public async getModuleKeysByPubKeys(moduleId: ModuleId, pubKeys: string[]): Promise<SRModuleKeyListResponse> {
    const { keys, module, elMeta } = await this.entityManager.transactional(
      async () => {
        // get module
        const stakingModule = await this.getStakingModule(moduleId);

        // maybe  this exception should not be sent here
        if (!stakingModule) {
          throw new NotFoundException(`Module with moduleId ${moduleId} is not supported`);
        }

        const elMeta = await this.getElBlockSnapshot();

        if (!elMeta) {
          this.logger.warn(`Meta is null, maybe data hasn't been written in db yet.`);
          throw httpExceptionTooEarlyResp();
        }

        const impl = config[stakingModule.type];
        const moduleInstance = this.moduleRef.get<StakingModuleInterface>(impl);

        // /v1/modules/{module_id}/keys/find return all module fields
        const keys: KeyEntity[] = await moduleInstance.getKeysByPubKeys(pubKeys, stakingModule.stakingModuleAddress);
        const module = new SRModule(stakingModule);

        return { keys, module, elMeta };
      },
      { isolationLevel: IsolationLevel.READ_COMMITTED },
    );

    return {
      data: { keys, module },
      meta: {
        elBlockSnapshot: new ELBlockSnapshot(elMeta),
      },
    };
  }

  // operators

  public async getOperatorsByModules(): Promise<GroupedByModuleOperatorListResponse> {
    const { operatorsByModules, elMeta } = await this.entityManager.transactional(
      async () => {
        // get list of modules
        const stakingModules = await this.getStakingModules();

        if (stakingModules.length === 0) {
          this.logger.warn("No staking modules in list. Maybe didn't fetched from SR yet");
          // TODO: should we throw here exception, or enough to return empty list?
          throw httpExceptionTooEarlyResp();
        }

        const elMeta = await this.getElBlockSnapshot();

        if (!elMeta) {
          this.logger.warn(`Meta is null, maybe data hasn't been written in db yet.`);
          throw httpExceptionTooEarlyResp();
        }

        const operatorsByModules: { operators: SRModuleOperator[]; module: SRModule }[] = [];

        for (const module of stakingModules) {
          // read from config name of module that implement functions to fetch and store keys for type
          // TODO: check what will happen if implementation is not a provider of StakingRouterModule
          const impl = config[module.type];
          const moduleInstance = this.moduleRef.get<StakingModuleInterface>(impl);
          // TODO: use here method with streams
          // TODO: add in select fields

          //  /v1/operators return these common fields for all modules
          // here should be request without module.stakingModuleAddress
          const operators: OperatorEntity[] = await moduleInstance.getOperators(module.stakingModuleAddress, {});

          operatorsByModules.push({ operators, module: new SRModule(module) });
        }

        return { operatorsByModules, elMeta };
      },
      { isolationLevel: IsolationLevel.READ_COMMITTED },
    );

    return {
      data: operatorsByModules,
      meta: {
        elBlockSnapshot: new ELBlockSnapshot(elMeta),
      },
    };
  }

  public async getModuleOperators(moduleId: ModuleId): Promise<SRModuleOperatorListResponse> {
    const { operators, module, elMeta } = await this.entityManager.transactional(
      async () => {
        // get list of modules
        const stakingModule = await this.getStakingModule(moduleId);

        if (!stakingModule) {
          throw new NotFoundException(`Module with moduleId ${moduleId} is not supported`);
        }

        const elMeta = await this.getElBlockSnapshot();

        if (!elMeta) {
          this.logger.warn(`Meta is null, maybe data hasn't been written in db yet.`);
          throw httpExceptionTooEarlyResp();
        }

        // read from config name of module that implement functions to fetch and store keys for type
        // TODO: check what will happen if implementation is not a provider of StakingRouterModule
        const impl = config[stakingModule.type];
        const moduleInstance = this.moduleRef.get<StakingModuleInterface>(impl);
        // TODO: use here method with streams
        // TODO: add in select fields

        //  /v1/operators return these common fields for all modules
        // here should be request without module.stakingModuleAddress
        const operators: OperatorEntity[] = await moduleInstance.getOperators(stakingModule.stakingModuleAddress, {});

        const module = new SRModule(stakingModule);

        return { operators, module, elMeta };
      },
      { isolationLevel: IsolationLevel.READ_COMMITTED },
    );

    return {
      data: {
        operators,
        module,
      },
      meta: {
        elBlockSnapshot: new ELBlockSnapshot(elMeta),
      },
    };
  }

  public async getModuleOperator(moduleId: ModuleId, operatorIndex: number): Promise<SRModuleOperatorResponse> {
    const { operator, module, elMeta } = await this.entityManager.transactional(
      async () => {
        // get list of modules
        const stakingModule = await this.getStakingModule(moduleId);

        if (!stakingModule) {
          throw new NotFoundException(`Module with moduleId ${moduleId} is not supported`);
        }

        const elMeta = await this.getElBlockSnapshot();

        if (!elMeta) {
          this.logger.warn(`Meta is null, maybe data hasn't been written in db yet.`);
          throw httpExceptionTooEarlyResp();
        }

        // read from config name of module that implement functions to fetch and store keys for type
        // TODO: check what will happen if implementation is not a provider of StakingRouterModule
        const impl = config[stakingModule.type];
        const moduleInstance = this.moduleRef.get<StakingModuleInterface>(impl);
        // TODO: use here method with streams
        // TODO: add in select fields

        //  /v1/operators return these common fields for all modules
        // here should be request without module.stakingModuleAddress
        const operator: OperatorEntity | null = await moduleInstance.getOperator(
          operatorIndex,
          stakingModule.stakingModuleAddress,
        );

        const module = new SRModule(stakingModule);

        return { operator, module, elMeta };
      },
      { isolationLevel: IsolationLevel.READ_COMMITTED },
    );

    if (!operator) {
      throw new NotFoundException(
        `Operator with index ${operatorIndex} is not found for module with moduleId ${moduleId}`,
      );
    }
    //  TODO: new CuratedOperator(operator);

    return {
      data: {
        operator,
        module,
      },
      meta: {
        elBlockSnapshot: new ELBlockSnapshot(elMeta),
      },
    };
  }

  public async getModuleOperatorsAndKeys(
    moduleId: ModuleId,
    filters: KeysFilter,
  ): Promise<SRModuleOperatorsKeysResponse> {
    const { operators, keys, module, elMeta } = await this.entityManager.transactional(
      async () => {
        // get list of modules
        const stakingModule = await this.getStakingModule(moduleId);

        if (!stakingModule) {
          throw new NotFoundException(`Module with moduleId ${moduleId} is not supported`);
        }

        const elMeta = await this.getElBlockSnapshot();

        if (!elMeta) {
          this.logger.warn(`Meta is null, maybe data hasn't been written in db yet.`);
          throw httpExceptionTooEarlyResp();
        }

        // read from config name of module that implement functions to fetch and store keys for type
        // TODO: check what will happen if implementation is not a provider of StakingRouterModule
        const impl = config[stakingModule.type];
        const moduleInstance = this.moduleRef.get<StakingModuleInterface>(impl);
        // TODO: use here method with streams
        // TODO: add in select fields

        const keys = await moduleInstance.getKeys(filters, stakingModule.stakingModuleAddress);

        // TODO: add filter in

        const operatorsFilter = filters.operatorIndex ? { index: filters.operatorIndex } : {};

        const operators = await moduleInstance.getOperators(stakingModule.stakingModuleAddress, operatorsFilter);

        const module = new SRModule(stakingModule);

        return { operators, keys, module, elMeta };
      },
      { isolationLevel: IsolationLevel.READ_COMMITTED },
    );

    return {
      data: {
        operators,
        keys,
        module,
      },
      meta: {
        elBlockSnapshot: new ELBlockSnapshot(elMeta),
      },
    };
  }

  // Helper methods to return N oldest validators

  public async getOperatorOldestValidators(
    moduleId: string,
    operatorIndex: number,
    filters: ValidatorsQuery,
  ): Promise<{ validators: Validator[]; meta: ConsensusMeta }> {
    const { validators, meta } = await this.entityManager.transactional(
      async () => {
        const stakingModule = await this.getStakingModule(moduleId);

        if (!stakingModule) {
          throw new NotFoundException(`Module with moduleId ${moduleId} is not supported`);
        }

        const elMeta = await this.getElBlockSnapshot();

        if (!elMeta) {
          this.logger.warn(`EL meta is empty, maybe first Updating Keys Job is not finished yet.`);
          throw httpExceptionTooEarlyResp();
        }

        // read from config name of module that implement functions to fetch and store keys for type
        // TODO: check what will happen if implementation is not a provider of StakingRouterModule
        const impl = config[stakingModule.type];
        const moduleInstance = this.moduleRef.get<StakingModuleInterface>(impl);
        // TODO: use here method with streams
        // TODO: add in select fields
        // all keys should be returned with the same fields

        // this method of modules with  StakingModuleInterface interface has common type of key
        // /v1/keys return these common fields for all modules
        // here should be request without module.stakingModuleAddress
        const keys = await moduleInstance.getKeys({ operatorIndex }, stakingModule.stakingModuleAddress, {
          populated: ['key'],
        });

        const pubkeys = keys.map((pubkey) => pubkey.key);
        const percent =
          filters?.max_amount == undefined && filters?.percent == undefined ? DEFAULT_EXIT_PERCENT : filters?.percent;

        const result = await this.validatorsService.getOldestValidators({
          pubkeys,
          statuses: VALIDATORS_STATUSES_FOR_EXIT,
          max_amount: filters?.max_amount,
          percent: percent,
        });

        if (!result) {
          // if result of this method is null it means Validators Registry is disabled
          throw new InternalServerErrorException(VALIDATORS_REGISTRY_DISABLED_ERROR);
        }

        const { validators, meta: clMeta } = result;

        // check if clMeta is not null
        // if it is null, it means keys db is empty and Updating Validators Job is not finished yet
        if (!clMeta) {
          this.logger.warn(`CL meta is empty, maybe first Updating Validators Job is not finished yet.`);
          throw httpExceptionTooEarlyResp();
        }

        // We need EL meta always be actual
        if (elMeta.blockNumber < clMeta.blockNumber) {
          this.logger.warn('Last Execution Layer block number in our database older than last Consensus Layer');
          // add metric or alert on breaking el > cl condition
          // TODO: what answer will be better here?
          // TODO: describe in doc
          throw new InternalServerErrorException(
            'Last Execution Layer block number in our database older than last Consensus Layer',
          );
        }

        return { validators, meta: clMeta };
      },
      { isolationLevel: IsolationLevel.READ_COMMITTED },
    );

    return { validators, meta };
  }
}
