import { Injectable } from '@nestjs/common';
import {
  KeyRegistryService,
  RegistryKeyStorageService,
  RegistryMetaStorageService,
  RegistryKey,
  RegistryMeta,
  RegistryOperator,
  RegistryOperatorStorageService,
} from '@lido-nestjs/registry';
import { EntityManager } from '@mikro-orm/postgresql';
import { KeyQuery } from 'http/common/entities';

@Injectable()
export class CuratedModuleService {
  constructor(
    protected readonly keyRegistryService: KeyRegistryService,
    protected readonly keyStorageService: RegistryKeyStorageService,
    protected readonly metaStorageService: RegistryMetaStorageService,
    protected readonly operatorStorageService: RegistryOperatorStorageService,
    protected readonly entityManager: EntityManager,
  ) {}

  public async updateKeys(blockHashOrBlockTag: string | number): Promise<void> {
    await this.keyRegistryService.update(blockHashOrBlockTag);
  }

  public async getKeyWithMetaByPubkey(pubkey: string): Promise<{ keys: RegistryKey[]; meta: RegistryMeta | null }> {
    const { keys, meta } = await this.entityManager.transactional(async () => {
      const keys = await this.keyStorageService.findByPubkey(pubkey.toLocaleLowerCase());
      const meta = await this.getMetaDataFromStorage();

      return { keys, meta };
    });

    return { keys, meta };
  }

  public async getKeysWithMetaByPubkeys(
    pubkeys: string[],
  ): Promise<{ keys: RegistryKey[]; meta: RegistryMeta | null }> {
    const { keys, meta } = await this.entityManager.transactional(async () => {
      const keys = await this.getKeysByPubkeys(pubkeys);
      const meta = await this.getMetaDataFromStorage();

      return { keys, meta };
    });

    return { keys, meta };
  }

  // TODO: add interface to filters
  public async getKeysWithMeta(filters): Promise<{ keys: RegistryKey[]; meta: RegistryMeta | null }> {
    const { keys, meta } = await this.entityManager.transactional(async () => {
      const keys = await this.keyStorageService.find(filters);
      const meta = await this.getMetaDataFromStorage();

      return { keys, meta };
    });

    return { keys, meta };
  }

  public async getMetaDataFromStorage(): Promise<RegistryMeta | null> {
    return await this.metaStorageService.get();
  }

  public async getOperatorsWithMeta(): Promise<{ operators: RegistryOperator[]; meta: RegistryMeta | null }> {
    const { operators, meta } = await this.entityManager.transactional(async () => {
      const operators = await this.operatorStorageService.findAll();
      const meta = await this.getMetaDataFromStorage();

      return { operators, meta };
    });

    return { operators, meta };
  }

  public async getOperatorByIndex(
    index: number,
  ): Promise<{ operator: RegistryOperator | null; meta: RegistryMeta | null }> {
    const { operator, meta } = await this.entityManager.transactional(async () => {
      const operator = await this.operatorStorageService.findOneByIndex(index);
      const meta = await this.getMetaDataFromStorage();

      return { operator, meta };
    });

    return { operator, meta };
  }

  public async getData(filters: KeyQuery): Promise<{
    operators: RegistryOperator[];
    keys: RegistryKey[];
    meta: RegistryMeta | null;
  }> {
    const { operators, keys, meta } = await this.entityManager.transactional(async () => {
      const operatorFilters = filters.operatorIndex ? { index: filters.operatorIndex } : {};
      const operators = await this.operatorStorageService.find(operatorFilters);
      const keys = await this.keyStorageService.find(filters);
      const meta = await this.getMetaDataFromStorage();

      return { operators, keys, meta };
    });

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
