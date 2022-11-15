import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { FIELDS, Key, KeysResponse } from './entities';
import { RegistryKey } from '@lido-nestjs/registry';
import { RegistryService } from 'jobs/registry.service';

import { EntityManager } from '@mikro-orm/postgresql';

@Injectable()
export class KeysService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    private keyRegistryService: RegistryService,
    private readonly entityManager: EntityManager,
  ) {}

  async getAll(fields: string[]): Promise<KeysResponse> {
    const { registryKeys, meta } = await this.entityManager.transactional(async () => {
      const registryKeys = await this.keyRegistryService.getAllKeysFromStorage();
      const meta = await this.keyRegistryService.getMetaDataFromStorage();

      return { registryKeys, meta };
    });

    const withSignature = fields.includes(FIELDS.SIGNATURE);
    const keys = registryKeys.map((key) => this.transformKey(key, withSignature));

    return {
      // swagger ui не справляется с выводом всех значений
      // стоит ли добавить пагинацию ? на основе бд или на основе работы с данными в памяти
      data: keys,
      meta: {
        blockNumber: meta?.blockNumber ?? 0,
        blockHash: meta?.blockHash ?? '',
      },
    };
  }

  async getByPubKeys(fields: string[], pubkeys: string[]): Promise<KeysResponse> {
    const { registryKeys, meta } = await this.entityManager.transactional(async () => {
      const registryKeys = await this.keyRegistryService.getOperatorKeys(pubkeys);
      const meta = await this.keyRegistryService.getMetaDataFromStorage();

      return { registryKeys, meta };
    });

    const withSignature = fields.includes(FIELDS.SIGNATURE);

    const keys = registryKeys.map((key) => this.transformKey(key, withSignature));

    return {
      data: keys,
      meta: {
        blockNumber: meta.blockNumber,
        blockHash: meta.blockHash,
      },
    };
  }

  private transformKey(registryKey: RegistryKey, withSignature: boolean): Key {
    if (withSignature) {
      return { key: registryKey.key, depositSignature: registryKey.depositSignature };
    }
    return { key: registryKey.key };
  }
}
