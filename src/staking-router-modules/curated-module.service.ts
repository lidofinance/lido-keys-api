import { Inject, Injectable } from '@nestjs/common';
import {
  KeyRegistryService,
  RegistryKeyStorageService,
  RegistryMetaStorageService,
  RegistryKey,
  RegistryMeta,
  RegistryOperator,
  RegistryOperatorStorageService,
} from 'common/registry';
import { EntityManager } from '@mikro-orm/postgresql';
import { Trace } from 'common/decorators/trace';
import { LOGGER_PROVIDER, LoggerService } from 'common/logger';
import { IsolationLevel } from '@mikro-orm/core';
import { StakingModuleInterface } from './interfaces/staking-module.interface';
import { KeysFilter } from './interfaces/keys-filter';

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

  @Trace(TRACE_TIMEOUT)
  public async updateKeys(blockHashOrBlockTag: string | number): Promise<void> {
    await this.keyRegistryService.update(blockHashOrBlockTag);
  }

  public async getKeyWithMetaByPubkey(pubkey: string): Promise<{ keys: RegistryKey[]; meta: RegistryMeta | null }> {
    const { keys, meta } = await this.entityManager.transactional(
      async () => {
        const keys = await this.keyStorageService.findByPubkey(pubkey.toLocaleLowerCase());
        const meta = await this.getMetaDataFromStorage();

        return { keys, meta };
      },
      { isolationLevel: IsolationLevel.REPEATABLE_READ },
    );

    return { keys, meta };
  }

  public async getKeysWithMetaByPubkeys(
    pubkeys: string[],
  ): Promise<{ keys: RegistryKey[]; meta: RegistryMeta | null }> {
    const { keys, meta } = await this.entityManager.transactional(
      async () => {
        const keys = await this.getKeysByPubkeys(pubkeys);
        const meta = await this.getMetaDataFromStorage();

        return { keys, meta };
      },
      { isolationLevel: IsolationLevel.REPEATABLE_READ },
    );

    return { keys, meta };
  }

  public async getKeysWithMeta(filters: KeysFilter): Promise<{ keys: RegistryKey[]; meta: RegistryMeta | null }> {
    const { keys, meta } = await this.entityManager.transactional(
      async () => {
        const where = {};
        if (filters.operatorIndex != undefined) {
          where['operatorIndex'] = filters.operatorIndex;
        }

        if (filters.used != undefined) {
          where['used'] = filters.used;
        }

        const keys = await this.keyStorageService.find(where);
        const meta = await this.getMetaDataFromStorage();

        return { keys, meta };
      },
      { isolationLevel: IsolationLevel.REPEATABLE_READ },
    );

    return { keys, meta };
  }

  public async getMetaDataFromStorage(): Promise<RegistryMeta | null> {
    return await this.metaStorageService.get();
  }

  public async getOperatorsWithMeta(): Promise<{ operators: RegistryOperator[]; meta: RegistryMeta | null }> {
    const { operators, meta } = await this.entityManager.transactional(
      async () => {
        const operators = await this.operatorStorageService.findAll();
        const meta = await this.getMetaDataFromStorage();

        return { operators, meta };
      },
      { isolationLevel: IsolationLevel.REPEATABLE_READ },
    );

    return { operators, meta };
  }

  public async getOperatorByIndex(
    index: number,
  ): Promise<{ operator: RegistryOperator | null; meta: RegistryMeta | null }> {
    const { operator, meta } = await this.entityManager.transactional(
      async () => {
        const operator = await this.operatorStorageService.findOneByIndex(index);
        const meta = await this.getMetaDataFromStorage();

        return { operator, meta };
      },
      { isolationLevel: IsolationLevel.REPEATABLE_READ },
    );

    return { operator, meta };
  }

  public async getData(filters: KeysFilter): Promise<{
    operators: RegistryOperator[];
    keys: RegistryKey[];
    meta: RegistryMeta | null;
  }> {
    const { operators, keys, meta } = await this.entityManager.transactional(
      async () => {
        const keysWhere = {};
        const operatorsWhere = {};
        if (filters.operatorIndex != undefined) {
          keysWhere['operatorIndex'] = filters.operatorIndex;
          operatorsWhere['index'] = filters.operatorIndex;
        }

        if (filters.used != undefined) {
          keysWhere['used'] = filters.used;
        }

        const operators = await this.operatorStorageService.find(operatorsWhere);
        const keys = await this.keyStorageService.find(keysWhere);
        const meta = await this.getMetaDataFromStorage();

        return { operators, keys, meta };
      },
      { isolationLevel: IsolationLevel.REPEATABLE_READ },
    );

    return { operators, keys, meta };
  }

  /**
   * Returns all keys found in db from pubkey list
   * @param pubKeys - public keys
   * @returns keys from DB
   */
  private async getKeysByPubkeys(pubKeys: string[]): Promise<RegistryKey[]> {
    return await this.keyStorageService.find({ key: { $in: pubKeys } });
  }
}
