import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { FIELDS, Key, AllKeysResponse, KeyResponse } from './entities';
import { RegistryKey } from '@lido-nestjs/registry';
import { RegistryService } from 'jobs/registry.service';

@Injectable()
export class KeysService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    private keyRegistryService: RegistryService,
  ) {}

  async getAll(fields: string[]): Promise<AllKeysResponse> {
    const registryKeys = await this.keyRegistryService.getAllKeysFromStorage();
    const meta = await this.keyRegistryService.getMetaDataFromStorage();
    const withSignature = fields.includes(FIELDS.SIGNATURE);
    const keys = registryKeys.map((key) => this.transformKey(key, withSignature));

    return {
      // swagger uo не справляется с выводом всех значений
      // стоит ли добавить пагинацию ? на основе бд или на основе работы с данными в памяти
      data: keys,
      meta: {
        blockNumber: meta?.blockNumber,
        blockHash: meta?.blockHash,
      },
    };
  }

  async getByPubKey(fields: string[], pubkey: string): Promise<KeyResponse> {
    const registryKey = await this.keyRegistryService.getOperatorKey(pubkey);
    const meta = await this.keyRegistryService.getMetaDataFromStorage();

    // будем ли возвращать коды 404 на отсутствие или просто 200 и undefined ?
    if (!registryKey) {
      return {
        data: undefined,
        meta: {
          blockNumber: meta?.blockNumber,
          blockHash: meta?.blockHash,
        },
      };
    }

    const withSignature = fields.includes(FIELDS.SIGNATURE);
    const key = this.transformKey(registryKey, withSignature);

    return {
      data: key,
      meta: {
        blockNumber: meta.blockNumber,
        blockHash: meta.blockHash,
      },
    };
  }

  private transformKey(registryKey: RegistryKey, withSignature: boolean): Key {
    if (withSignature) {
      return { pubkey: registryKey.key, signature: registryKey.depositSignature };
    }
    return { pubkey: registryKey.key };
  }
}
