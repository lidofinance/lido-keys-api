import { EntityManager } from '@mikro-orm/knex';
import { Inject, Injectable, InternalServerErrorException, LoggerService, NotFoundException } from '@nestjs/common';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { ModuleRef } from '@nestjs/core';
import { StakingRouterFetchService } from 'staking-router-modules/contracts';
import { ExecutionProviderService } from 'common/execution-provider';

import { KeyEntity, OperatorEntity, StakingModuleInterface } from './interfaces/staking-module.interface';
import { httpExceptionTooEarlyResp } from 'http/common/entities/http-exceptions';
import { KeyWithModuleAddress } from 'http/keys/entities';
import { CLBlockSnapshot, ELBlockSnapshot, Key, ModuleId, SRModule } from 'http/common/entities';
import { config } from './staking-module-impl-config';
import { IsolationLevel } from '@mikro-orm/core';
import { SrModuleEntity } from 'storage/sr-module.entity';
import { SRModuleStorageService } from 'storage/sr-module.storage';
import { ElMetaStorageService } from 'storage/el-meta.storage';
import { ElMetaEntity } from 'storage/el-meta.entity';
import { isValidContractAddress } from './utils';
import { ValidatorsQuery } from 'http/sr-modules-validators/entities';
import { Validator } from '@lido-nestjs/validators-registry';
import {
  DEFAULT_EXIT_PERCENT,
  VALIDATORS_STATUSES_FOR_EXIT,
  VALIDATORS_REGISTRY_DISABLED_ERROR,
} from 'validators/validators.constants';
import { ValidatorsService } from 'validators';

import { PrometheusService } from 'common/prometheus';
import { KeyField, KeysFilter } from './interfaces/filters';
import { STAKING_MODULE_TYPE } from './constants';

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
    protected readonly prometheusService: PrometheusService,
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

    return await this.srModulesStorage.findOneById(Number(moduleId));
  }

  public getStakingRouterModuleImpl(moduleType: string): StakingModuleInterface {
    const impl = config[moduleType];
    const moduleInstance = this.moduleRef.get<StakingModuleInterface>(impl);
    return moduleInstance;
  }

  /**
   * Update keys of staking modules
   * @returns Number, hash and timestamp of execution layer block
   */
  public async update(): Promise<{ number: number; hash: string; timestamp: number } | undefined> {
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

    // TODO: what will happen if module исчез из списка
    // TODO: is it correct that i use here modules from blockchain instead of storage

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
          const currNonce = await moduleInstance.getCurrentNonce(module.stakingModuleAddress, currElMeta.hash);
          const moduleInStorage = await this.srModulesStorage.findOneById(module.id);

          // now updating decision should be here moduleInstance.updateKeys
          if (moduleInStorage && moduleInStorage.nonce === currNonce) {
            // nothing changed, don't need to update
            // TODO: add log
            return;
          }

          await this.srModulesStorage.store(module, currNonce);
          await moduleInstance.update(module.stakingModuleAddress, currElMeta.hash);
        }
      },
      { isolationLevel: IsolationLevel.READ_COMMITTED },
    );

    return currElMeta;
  }

  /**
   * Update prometheus metrics of staking modules
   */
  public async updateMetrics() {
    await this.entityManager.transactional(
      async () => {
        const stakingModules = await this.getStakingModules();
        const elMeta = await this.getElBlockSnapshot();

        if (!elMeta) {
          return;
        }

        // update timestamp and block number metrics
        this.prometheusService.registryLastUpdate.set(elMeta.timestamp);
        this.prometheusService.registryBlockNumber.set(elMeta.blockNumber);

        for (const module of stakingModules) {
          // read from config name of module that implement functions to fetch and store keys for type
          // TODO: check what will happen if implementation is not a provider of StakingRouterModule
          const impl = config[module.type];
          const moduleInstance = this.moduleRef.get<StakingModuleInterface>(impl);

          // update nonce metric
          this.prometheusService.registryNonce.set({ srModuleId: module.id }, module.nonce);

          // get operators
          const operators = await moduleInstance.getOperators(module.stakingModuleAddress);
          this.prometheusService.registryNumberOfKeysBySRModuleAndOperator.reset();

          operators.forEach((operator) => {
            this.prometheusService.registryNumberOfKeysBySRModuleAndOperator.set(
              {
                operator: operator.index,
                srModuleId: module.id,
                used: 'true',
              },
              operator.usedSigningKeys,
            );

            this.prometheusService.registryNumberOfKeysBySRModuleAndOperator.set(
              {
                operator: operator.index,
                srModuleId: module.id,
                used: 'false',
              },
              operator.totalSigningKeys - operator.usedSigningKeys,
            );
          });
        }
      },
      { isolationLevel: IsolationLevel.REPEATABLE_READ },
    );
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

  // TODO: check why we don't have a type conflict here
  // /**
  //  * Return generators for keys of all modules with fields {key, depositSignature, operatorIndex, used, moduleAddress} and execution layer meta
  //  * @param filters used, operatorIndex
  //  * @returns List of generators for keys and execution layer meta
  //  */
  // public async getKeys(
  //   filters: KeysFilter,
  // ): Promise<{ keysGenerators: AsyncGenerator<KeyWithModuleAddress>[]; elBlockSnapshot: ELBlockSnapshot }> {
  //   const { stakingModules, elBlockSnapshot } = await this.getStakingModulesAndMeta();
  //   const keysGenerators: AsyncGenerator<KeyWithModuleAddress>[] = [];

  //   for (const module of stakingModules) {
  //     const impl = config[module.type];
  //     const moduleInstance = this.moduleRef.get<StakingModuleInterface>(impl);

  //     const fields: KeyField[] = ['key', 'depositSignature', 'operatorIndex', 'used', 'moduleAddress'];
  //     // TODO: maybe get rid of this type KeyWithModuleAddress
  //     const keysGenerator: AsyncGenerator<KeyWithModuleAddress> = await moduleInstance.getKeysStream(
  //       module.stakingModuleAddress,
  //       filters,
  //       fields,
  //     );

  //     keysGenerators.push(keysGenerator);
  //   }

  //   return { keysGenerators, elBlockSnapshot };
  // }

  /**
   * Return keys from pubKeys list with fields {key, depositSignature, operatorIndex, used, moduleAddress}
   * @param pubKeys list of public keys for searching
   * @returns list of keys with fields {key, depositSignature, operatorIndex, used, moduleAddress} and execution layer meta
   */
  // public async getKeysByPubkeys(
  //   pubKeys: string[],
  // ): Promise<{ keys: KeyWithModuleAddress[]; elBlockSnapshot: ELBlockSnapshot }> {
  //   const { keys, elBlockSnapshot } = await this.entityManager.transactional(
  //     async () => {
  //       const { stakingModules, elBlockSnapshot } = await this.getStakingModulesAndMeta();
  //       const collectedKeys: KeyWithModuleAddress[][] = [];

  //       for (const module of stakingModules) {
  //         const impl = config[module.type];
  //         const moduleInstance = this.moduleRef.get<StakingModuleInterface>(impl);

  //         const fields: KeyField[] = ['key', 'depositSignature', 'operatorIndex', 'used', 'moduleAddress'];
  //         const keys: KeyWithModuleAddress[] = await moduleInstance.getKeysByPubKeys(
  //           module.stakingModuleAddress,
  //           pubKeys,
  //           fields,
  //         );

  //         collectedKeys.push(keys);
  //       }

  //       return { keys: collectedKeys.flat(), elBlockSnapshot };
  //     },
  //     { isolationLevel: IsolationLevel.REPEATABLE_READ },
  //   );

  //   return { keys, elBlockSnapshot };
  // }

  /**
   * Return generators for keys of all modules with fields {key, depositSignature, operatorIndex, used } and execution layer meta
   * @param filters used, operatorIndex
   * @returns List of generators for keys and execution layer meta
   */
  public async getKeysByModules(filters: KeysFilter): Promise<{
    keysGeneratorsByModules: { keysGenerator: AsyncGenerator<Key>; module: SRModule }[];
    elBlockSnapshot: ELBlockSnapshot;
  }> {
    const { stakingModules, elBlockSnapshot } = await this.getStakingModulesAndMeta();
    const keysGeneratorsByModules: { keysGenerator: any; module: SRModule }[] = [];

    for (const module of stakingModules) {
      // read from config name of module that implement functions to fetch and store keys for type
      // TODO: check what will happen if implementation is not a provider of StakingRouterModule
      const impl = config[module.type];
      const moduleInstance = this.moduleRef.get<StakingModuleInterface>(impl);

      const fields: KeyField[] = ['key', 'depositSignature', 'operatorIndex', 'used'];
      const keysGenerator: AsyncGenerator<Key> = await moduleInstance.getKeysStream(
        module.stakingModuleAddress,
        filters,
        fields,
      );

      keysGeneratorsByModules.push({ keysGenerator, module: new SRModule(module) });
    }

    return {
      keysGeneratorsByModules,
      elBlockSnapshot,
    };
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

  public async getModuleKeys(
    moduleId: ModuleId,
    filters: KeysFilter,
  ): Promise<{ keysGenerator: AsyncGenerator<KeyEntity>; module: SRModule; elBlockSnapshot: ELBlockSnapshot }> {
    const { module, elBlockSnapshot } = await this.getStakingModuleAndMeta(moduleId);

    const impl = config[module.type];
    const moduleInstance = this.moduleRef.get<StakingModuleInterface>(impl);

    const keysGenerator: AsyncGenerator<KeyEntity> = await moduleInstance.getKeysStream(
      module.stakingModuleAddress,
      filters,
    );

    return {
      keysGenerator,
      module,
      elBlockSnapshot,
    };
  }

  public async getModuleKeysByPubKeys(
    moduleId: ModuleId,
    pubKeys: string[],
  ): Promise<{
    keys: KeyEntity[];
    module: SRModule;
    elBlockSnapshot: ELBlockSnapshot;
  }> {
    const { keys, module, elBlockSnapshot } = await this.entityManager.transactional(
      async () => {
        const { module, elBlockSnapshot } = await this.getStakingModuleAndMeta(moduleId);
        const impl = config[module.type];
        const moduleInstance = this.moduleRef.get<StakingModuleInterface>(impl);

        const keys: KeyEntity[] = await moduleInstance.getKeysByPubKeys(module.stakingModuleAddress, pubKeys);

        return { keys, module, elBlockSnapshot };
      },
      { isolationLevel: IsolationLevel.REPEATABLE_READ },
    );

    return {
      keys,
      module,
      elBlockSnapshot,
    };
  }

  public async getOperatorsByModules(): Promise<{
    operatorsByModules: { operators: OperatorEntity[]; module: SRModule }[];
    elBlockSnapshot: ELBlockSnapshot;
  }> {
    const { operatorsByModules, elBlockSnapshot } = await this.entityManager.transactional(
      async () => {
        const { stakingModules, elBlockSnapshot } = await this.getStakingModulesAndMeta();
        const operatorsByModules: { operators: OperatorEntity[]; module: SRModule }[] = [];

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

        return { operatorsByModules, elBlockSnapshot };
      },
      { isolationLevel: IsolationLevel.REPEATABLE_READ },
    );

    return {
      operatorsByModules,
      elBlockSnapshot,
    };
  }

  // TODO: is it okay that we have moduleAddress in every opertor now ?
  public async getModuleOperators(
    moduleId: ModuleId,
  ): Promise<{ operators: OperatorEntity[]; module: SRModule; elBlockSnapshot: ELBlockSnapshot }> {
    const { operators, module, elBlockSnapshot } = await this.entityManager.transactional(
      async () => {
        const { module, elBlockSnapshot } = await this.getStakingModuleAndMeta(moduleId);

        // read from config name of module that implement functions to fetch and store keys for type
        // TODO: check what will happen if implementation is not a provider of StakingRouterModule
        const impl = config[module.type];
        const moduleInstance = this.moduleRef.get<StakingModuleInterface>(impl);
        // TODO: use here method with streams
        // TODO: add in select fields

        //  /v1/operators return these common fields for all modules
        // here should be request without module.stakingModuleAddress
        const operators: OperatorEntity[] = await moduleInstance.getOperators(module.stakingModuleAddress, {});

        return { operators, module, elBlockSnapshot };
      },
      { isolationLevel: IsolationLevel.REPEATABLE_READ },
    );

    return {
      operators,
      module,
      elBlockSnapshot,
    };
  }

  public async getModuleOperator(
    moduleId: ModuleId,
    operatorIndex: number,
  ): Promise<{ operator: OperatorEntity; module: SRModule; elBlockSnapshot: ELBlockSnapshot }> {
    const { operator, module, elBlockSnapshot } = await this.entityManager.transactional(
      async () => {
        const { module, elBlockSnapshot } = await this.getStakingModuleAndMeta(moduleId);

        // read from config name of module that implement functions to fetch and store keys for type
        // TODO: check what will happen if implementation is not a provider of StakingRouterModule
        const impl = config[module.type];
        const moduleInstance = this.moduleRef.get<StakingModuleInterface>(impl);

        const operator: OperatorEntity | null = await moduleInstance.getOperator(
          module.stakingModuleAddress,
          operatorIndex,
        );

        return { operator, module, elBlockSnapshot };
      },
      { isolationLevel: IsolationLevel.REPEATABLE_READ },
    );

    if (!operator) {
      throw new NotFoundException(
        `Operator with index ${operatorIndex} is not found for module with moduleId ${moduleId}`,
      );
    }

    return {
      operator,
      module,
      elBlockSnapshot,
    };
  }

  /**
   *
   * @param moduleId
   * @param filters
   * @returns
   */
  public async getModuleOperatorsAndKeys(
    moduleId: ModuleId,
    filters: KeysFilter,
  ): Promise<{
    operators: OperatorEntity[];
    keysGenerator: AsyncGenerator<KeyEntity>;
    module: SRModule;
    elBlockSnapshot: ELBlockSnapshot;
  }> {
    const { module, elBlockSnapshot } = await this.getStakingModuleAndMeta(moduleId);

    // read from config name of module that implement functions to fetch and store keys for type
    // TODO: check what will happen if implementation is not a provider of StakingRouterModule
    const impl = config[module.type];
    const moduleInstance = this.moduleRef.get<StakingModuleInterface>(impl);
    // TODO: use here method with streams
    // TODO: add in select fields

    const keysGenerator: AsyncGenerator<KeyEntity> = await moduleInstance.getKeysStream(
      module.stakingModuleAddress,
      filters,
    );
    // TODO: add filter in
    const operatorsFilter = filters.operatorIndex ? { index: filters.operatorIndex } : {};
    const operators: OperatorEntity[] = await moduleInstance.getOperators(module.stakingModuleAddress, operatorsFilter);

    return {
      operators,
      keysGenerator,
      module,
      elBlockSnapshot,
    };
  }

  // Helper methods to return N oldest validators

  public async getOperatorOldestValidators(
    moduleId: string,
    operatorIndex: number,
    filters: ValidatorsQuery,
  ): Promise<{ validators: Validator[]; clBlockSnapshot: CLBlockSnapshot }> {
    const { validators, meta } = await this.entityManager.transactional(
      async () => {
        const { module, elBlockSnapshot } = await this.getStakingModuleAndMeta(moduleId);

        // read from config name of module that implement functions to fetch and store keys for type
        // TODO: check what will happen if implementation is not a provider of StakingRouterModule
        const impl = config[module.type];
        const moduleInstance = this.moduleRef.get<StakingModuleInterface>(impl);
        const keys = await moduleInstance.getKeys(module.stakingModuleAddress, { operatorIndex }, ['key']);

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
        if (elBlockSnapshot.blockNumber < clMeta.blockNumber) {
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
      { isolationLevel: IsolationLevel.REPEATABLE_READ },
    );

    return { validators, clBlockSnapshot: new CLBlockSnapshot(meta) };
  }
}
