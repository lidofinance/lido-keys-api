import { Inject, Injectable, LoggerService, Optional } from '@nestjs/common';
import { Registry, REGISTRY_CONTRACT_TOKEN } from '@lido-nestjs/contracts';
import { EntityManager } from '@mikro-orm/knex';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';

import { RegistryMetaFetchService } from '../fetch/meta.fetch';
import { RegistryKeyFetchService } from '../fetch/key.fetch';
import { RegistryOperatorFetchService } from '../fetch/operator.fetch';

import { RegistryMetaStorageService } from '../storage/meta.storage';
import { RegistryKeyStorageService } from '../storage/key.storage';
import { RegistryOperatorStorageService } from '../storage/operator.storage';

import { RegistryKey } from '../storage/key.entity';
import { RegistryOperator } from '../storage/operator.entity';

import { compareOperators } from '../utils/operator.utils';

import { REGISTRY_GLOBAL_OPTIONS_TOKEN } from './constants';
import { RegistryOptions } from './interfaces/module.interface';
import { chunk } from '@lido-nestjs/utils';
import { RegistryKeyBatchFetchService } from '../fetch/key-batch.fetch';
import { IsolationLevel } from '@mikro-orm/core';

@Injectable()
export abstract class AbstractRegistryService {
  constructor(
    @Inject(REGISTRY_CONTRACT_TOKEN) protected registryContract: Registry,
    @Inject(LOGGER_PROVIDER) protected logger: LoggerService,

    protected readonly metaFetch: RegistryMetaFetchService,
    protected readonly metaStorage: RegistryMetaStorageService,

    protected readonly keyFetch: RegistryKeyFetchService,
    protected readonly keyBatchFetch: RegistryKeyBatchFetchService,
    protected readonly keyStorage: RegistryKeyStorageService,

    protected readonly operatorFetch: RegistryOperatorFetchService,
    protected readonly operatorStorage: RegistryOperatorStorageService,

    protected readonly entityManager: EntityManager,

    @Optional()
    @Inject(REGISTRY_GLOBAL_OPTIONS_TOKEN)
    public options?: RegistryOptions,
  ) {}

  /** collects changed data from the contract and store it to the db */
  public async update(blockHash: string, moduleAddress: string) {
    const previousOperators = await this.getOperatorsFromStorage();
    const currentOperators = await this.getOperatorsFromContract(blockHash, moduleAddress);

    this.logger.log('Collected operators', {
      previousOperators: previousOperators.length,
      currentOperators: currentOperators.length,
    });

    await this.entityManager.transactional(
      async () => {
        await this.saveOperators(currentOperators);

        this.logger.log('Saved data operators to the DB', {
          operators: currentOperators.length,
        });

        await this.syncUpdatedKeysWithContract(previousOperators, currentOperators, blockHash, moduleAddress);
      },
      { isolationLevel: IsolationLevel.READ_COMMITTED },
    );
  }

  /** returns operators from the contract */
  public async getOperatorsFromContract(blockHash: string, moduleAddress: string) {
    const overrides = { blockTag: { blockHash } };
    return await this.operatorFetch.fetch(0, -1, moduleAddress, overrides);
  }

  /** returns the right border of the update keys range */
  abstract getToIndex(currOperator: RegistryOperator): number;

  /** sync keys with contract */
  public async syncUpdatedKeysWithContract(
    previousOperators: RegistryOperator[],
    currentOperators: RegistryOperator[],
    blockHash: string,
    moduleAddress: string,
  ) {
    // TODO: disable console time after testing
    console.time('FETCH_OPERATORS');
    /**
     * TODO: optimize a number of queries
     * it's possible to update keys faster by using different strategies depending on the reason for the update
     */
    for (const [currentIndex, currOperator] of currentOperators.entries()) {
      // check if the operator in the registry has changed since the last update
      const prevOperator = previousOperators[currentIndex] ?? null;
      const isSameOperator = compareOperators(prevOperator, currOperator);

      // skip updating keys from 0 to `usedSigningKeys` of previous collected data
      // since the contract guarantees that these keys cannot be changed
      const unchangedKeysMaxIndex = isSameOperator ? prevOperator.usedSigningKeys : 0;
      // get the right border up to which the keys should be updated
      // it's different for different scenarios
      const toIndex = this.getToIndex(currOperator);

      // fromIndex may become larger than toIndex if used keys are deleted
      // this should not happen in mainnet, but sometimes keys can be deleted in testnet by modification of the contract
      const fromIndex = unchangedKeysMaxIndex <= toIndex ? unchangedKeysMaxIndex : 0;

      const operatorIndex = currOperator.index;
      const overrides = { blockTag: { blockHash } };
      // TODO: use feature flag
      const result = await this.keyBatchFetch.fetch(operatorIndex, fromIndex, toIndex, moduleAddress, overrides);
      // add moduleAddress
      const operatorKeys = result.filter((key) => key);

      this.logger.log('Keys fetched', {
        operatorIndex,
        fromIndex,
        toIndex,
        operatorKeys: operatorKeys.length,
        fetchedKeys: result.length,
      });

      await this.saveKeys(operatorKeys);

      this.logger.log('Keys saved', { operatorIndex });
    }

    console.timeEnd('FETCH_OPERATORS');
  }

  /** storage */

  /** returns the latest operators data from the db */
  public async getOperatorsFromStorage() {
    return await this.operatorStorage.findAll();
  }

  /** returns all the keys from storage */
  public async getOperatorsKeysFromStorage() {
    return await this.keyStorage.findAll();
  }

  public async saveKeys(keys: RegistryKey[]) {
    await this.entityManager.transactional(async (entityManager) => {
      await Promise.all(
        // 500 — SQLite limit in insert operation
        chunk(keys, 499).map(async (keysChunk) => {
          await entityManager
            .createQueryBuilder(RegistryKey)
            .insert(keysChunk)
            .onConflict(['index', 'operator_index'])
            .merge()
            .execute();
        }),
      );
    });
  }

  /** contract */
  /** returns the meta data from the contract */
  public async getNonceFromContract(blockHash: string, moduleAddress: string): Promise<number> {
    const keysOpIndex = await this.metaFetch.fetchKeysOpIndex(moduleAddress, { blockTag: { blockHash } });
    return keysOpIndex;
  }

  /** saves all the data to the db */
  public async saveOperators(currentOperators: RegistryOperator[]) {
    // save all data in a transaction
    await this.entityManager.transactional(async (entityManager) => {
      await Promise.all(
        // remove all keys from the database that are greater than the total number of keys
        // it's needed to clear the list in db when removing keys from the contract
        currentOperators.map(async (operator) => {
          await entityManager.nativeDelete(RegistryKey, {
            index: { $gte: operator.totalSigningKeys },
            operatorIndex: operator.index,
          });
        }),
      );

      await Promise.all(
        // 500 — SQLite limit in insert operation
        chunk(currentOperators, 499).map(async (operatorsChunk) => {
          await entityManager
            .createQueryBuilder(RegistryOperator)
            .insert(operatorsChunk)
            .onConflict('index')
            .merge()
            .execute();
        }),
      );
    });
  }

  /** clears the db */
  public async clear() {
    await this.entityManager.transactional(async (entityManager) => {
      entityManager.nativeDelete(RegistryKey, {});
      entityManager.nativeDelete(RegistryOperator, {});
    });
  }
}
