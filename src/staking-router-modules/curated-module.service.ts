import { Inject, Injectable } from '@nestjs/common';
import {
  KeyRegistryService,
  RegistryKeyStorageService,
  RegistryKey,
  RegistryOperator,
  RegistryOperatorStorageService,
} from '../common/registry';
import { LOGGER_PROVIDER, LoggerService } from '../common/logger';
import { QueryOrder } from '@mikro-orm/core';
import { StakingModuleInterface } from './interfaces/staking-module.interface';
import { KeysFilter, OperatorsFilter } from './interfaces/filters';

@Injectable()
export class CuratedModuleService implements StakingModuleInterface {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected readonly keyRegistryService: KeyRegistryService,
    protected readonly keyStorageService: RegistryKeyStorageService,
    protected readonly operatorStorageService: RegistryOperatorStorageService,
  ) {}

  public async update(moduleAddress: string, blockHash: string): Promise<void> {
    await this.keyRegistryService.update(moduleAddress, blockHash);
  }

  public async operatorsWereChanged(
    moduleAddress: string,
    fromBlockNumber: number,
    toBlockNumber: number,
  ): Promise<boolean> {
    return await this.keyRegistryService.operatorsWereChanged(moduleAddress, fromBlockNumber, toBlockNumber);
  }

  public async updateOperators(moduleAddress: string, blockHash: string): Promise<void> {
    await this.keyRegistryService.updateOperators(moduleAddress, blockHash);
  }

  public async getCurrentNonce(moduleAddress: string, blockHash: string): Promise<number> {
    const nonce = await this.keyRegistryService.getStakingModuleNonce(moduleAddress, blockHash);
    return nonce;
  }

  public async getKeys(moduleAddress: string, filters: KeysFilter): Promise<RegistryKey[]> {
    const where = {};
    if (filters.operatorIndex != undefined) {
      where['operatorIndex'] = filters.operatorIndex;
    }

    if (filters.used != undefined) {
      where['used'] = filters.used;
    }

    // we store keys of modules with the same impl at the same table
    where['moduleAddress'] = moduleAddress;

    const keys = await this.keyStorageService.find(where);

    return keys;
  }

  public async *getKeysStream(moduleAddress: string, filters: KeysFilter): AsyncGenerator<RegistryKey> {
    const where = {};
    if (filters.operatorIndex != undefined) {
      where['operatorIndex'] = filters.operatorIndex;
    }

    if (filters.used != undefined) {
      where['used'] = filters.used;
    }

    where['moduleAddress'] = moduleAddress;

    const batchSize = 10_000;
    let offset = 0;

    while (true) {
      const chunk = await this.keyStorageService.find(where, {
        limit: batchSize,
        offset,
        orderBy: [{ operatorIndex: QueryOrder.ASC }, { index: QueryOrder.ASC }],
      });

      if (chunk.length === 0) {
        break;
      }

      offset += batchSize;

      for (const record of chunk) {
        yield record;
      }
    }
  }

  public async getKeysByPubKeys(moduleAddress: string, pubKeys: string[]): Promise<RegistryKey[]> {
    return await this.keyStorageService.find({ key: { $in: pubKeys }, moduleAddress });
  }

  public async getKeysByPubkey(moduleAddress: string, pubKey: string): Promise<RegistryKey[]> {
    return await this.keyStorageService.find({ key: pubKey.toLocaleLowerCase(), moduleAddress });
  }

  public async getOperators(moduleAddress: string, filters?: OperatorsFilter): Promise<RegistryOperator[]> {
    const where = {};
    if (filters?.index != undefined) {
      where['index'] = filters.index;
    }
    // we store operators of modules with the same impl at the same table
    where['moduleAddress'] = moduleAddress;
    return await this.operatorStorageService.find(where, { orderBy: [{ index: QueryOrder.ASC }] });
  }

  public async getOperator(moduleAddress: string, index: number): Promise<RegistryOperator | null> {
    const operators = await this.operatorStorageService.find({ moduleAddress, index });
    return operators[0];
  }
}
