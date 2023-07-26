import { Inject, Injectable } from '@nestjs/common';
import {
  KeyRegistryService,
  RegistryKeyStorageService,
  RegistryMetaStorageService,
  RegistryKey,
  RegistryOperator,
  RegistryOperatorStorageService,
} from 'common/registry';
import { EntityManager } from '@mikro-orm/postgresql';
import { Trace } from 'common/decorators/trace';
import { LOGGER_PROVIDER, LoggerService } from 'common/logger';
import { IsolationLevel, QueryOrder } from '@mikro-orm/core';
import { StakingModuleInterface } from './interfaces/staking-module.interface';
import { KeysFilter } from './interfaces/keys-filter';
import { OperatorsFilter } from './interfaces';

const TRACE_TIMEOUT = 15 * 60 * 1000;

@Injectable()
export class CuratedModuleService implements StakingModuleInterface {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected readonly keyRegistryService: KeyRegistryService,
    protected readonly keyStorageService: RegistryKeyStorageService,
    protected readonly metaStorageService: RegistryMetaStorageService,
    protected readonly operatorStorageService: RegistryOperatorStorageService,
    protected readonly entityManager: EntityManager,
  ) {}

  // we need it
  @Trace(TRACE_TIMEOUT)
  public async update(blockHashOrBlockTag: string | number, contractAddress: string): Promise<void> {
    await this.keyRegistryService.update(blockHashOrBlockTag, contractAddress);
  }

  // we need it
  public async getCurrentNonce(blockHashOrBlockTag: string | number, contractAddress: string): Promise<number> {
    // create in keyRegistryService just value for getting nonce from contract
    const { keysOpIndex } = await this.keyRegistryService.getMetaDataFromContract(blockHashOrBlockTag, contractAddress);
    // TODO: get nonce
    return keysOpIndex;
  }

  // TODO: add type for options
  // this function can return type with different number of fields
  // is it okay define here a type RegistryKey?
  public async getKeys(filters: KeysFilter, moduleAddress: string, options = undefined): Promise<RegistryKey[]> {
    const keys = await this.entityManager.transactional(
      async () => {
        const where = {};
        if (filters.operatorIndex != undefined) {
          where['operatorIndex'] = filters.operatorIndex;
        }

        if (filters.used != undefined) {
          where['used'] = filters.used;
        }

        // we store keys of modules with the same impl at the same table
        where['moduleAddress'] = moduleAddress;

        const keys = await this.keyStorageService.find(where, options);

        return keys;
      },
      { isolationLevel: IsolationLevel.REPEATABLE_READ },
    );

    return keys;
  }

  public async getKeysByPubKeys(pubKeys: string[], moduleAddress: string, options = undefined): Promise<RegistryKey[]> {
    return await this.keyStorageService.find({ key: { $in: pubKeys }, moduleAddress }, options);
  }

  public async getKeysByPubkey(pubKey: string, moduleAddress: string, options = undefined): Promise<RegistryKey[]> {
    return await this.keyStorageService.find({ key: pubKey.toLocaleLowerCase(), moduleAddress }, options);
  }

  public async getOperators(moduleAddress: string, filters: OperatorsFilter): Promise<RegistryOperator[]> {
    const where = {};
    if (filters.index != undefined) {
      where['index'] = filters.index;
    }
    // we store operators of modules with the same impl at the same table
    where['moduleAddress'] = moduleAddress;
    return await this.operatorStorageService.find(where, { orderBy: [{ index: QueryOrder.ASC }] });
  }

  public async getOperator(index: number, moduleAddress: string): Promise<RegistryOperator | null> {
    const operators = await this.operatorStorageService.find({ moduleAddress, index });
    return operators[0];
  }

  // todo: should replace getKeys and other methods
  public async getKeysWithMetaStream(filters: KeysFilter): Promise<any> {
    const where = {};
    if (filters.operatorIndex != undefined) {
      where['operatorIndex'] = filters.operatorIndex;
    }

    if (filters.used != undefined) {
      where['used'] = filters.used;
    }

    const keysStream = await this.keyStorageService.fetchKeysByChunks(where, {});
    return keysStream;
  }
}
