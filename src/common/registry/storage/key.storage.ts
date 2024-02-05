import { QueryOrder } from '@mikro-orm/core';
import { FilterQuery, FindOptions } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import { addTimeoutToStream } from '../utils/stream.utils';
import { RegistryKey } from './key.entity';
import { RegistryKeyRepository } from './key.repository';
import { STREAM_KEYS_TIMEOUT_MESSAGE, STREAM_TIMEOUT } from './constants';

@Injectable()
export class RegistryKeyStorageService {
  constructor(private readonly repository: RegistryKeyRepository) {}

  /** find keys */
  async find<P extends string = never>(
    where: FilterQuery<RegistryKey>,
    options?: FindOptions<RegistryKey, P>,
  ): Promise<RegistryKey[]> {
    return await this.repository.find(where, options);
  }

  findAsStream(where: FilterQuery<RegistryKey>, fields?: string[]): AsyncIterable<RegistryKey> {
    const qb = this.repository.createQueryBuilder();
    qb.select(fields || '*')
      .where(where)
      .orderBy({ operator_index: 'asc', index: 'asc' });

    const knex = qb.getKnexQuery();
    const stream = knex.stream();

    addTimeoutToStream(stream, STREAM_TIMEOUT, STREAM_KEYS_TIMEOUT_MESSAGE);

    return stream;
  }

  /** find all keys */
  async findAll(moduleAddress: string): Promise<RegistryKey[]> {
    return await this.repository.find(
      { moduleAddress },
      {
        orderBy: [{ operatorIndex: QueryOrder.ASC }, { index: QueryOrder.ASC }],
      },
    );
  }

  /** find used keys */
  async findUsed(moduleAddress: string): Promise<RegistryKey[]> {
    return await this.repository.find({ used: true, moduleAddress });
  }

  /** find all keys by operator */
  async findByOperatorIndex(moduleAddress: string, operatorIndex: number): Promise<RegistryKey[]> {
    return await this.repository.find({ operatorIndex, moduleAddress });
  }

  /** find key by pubkey */
  async findByPubkey(moduleAddress: string, key: string): Promise<RegistryKey[]> {
    return await this.repository.find({ moduleAddress, key: key.toLocaleLowerCase() });
  }

  /** find key by signature */
  async findBySignature(moduleAddress, depositSignature: string): Promise<RegistryKey[]> {
    depositSignature = depositSignature.toLocaleLowerCase();
    return await this.repository.find({ moduleAddress, depositSignature });
  }

  /** find key by index */
  async findOneByIndex(moduleAddress, operatorIndex: number, keyIndex: number): Promise<RegistryKey | null> {
    return await this.repository.findOne({ moduleAddress, operatorIndex, index: keyIndex });
  }

  /** removes key by index */
  async removeOneByIndex(moduleAddress, operatorIndex: number, keyIndex: number) {
    return await this.repository.nativeDelete({
      moduleAddress,
      operatorIndex,
      index: keyIndex,
    });
  }

  /** removes all keys */
  async removeAll() {
    return await this.repository.nativeDelete({});
  }

  /** saves key to storage */
  async saveOne(operatorKey: RegistryKey) {
    const key = new RegistryKey(operatorKey);
    return await this.repository.persistAndFlush(key);
  }

  /** saves multiply keys to storage */
  async save(operatorKeys: RegistryKey[]) {
    const result = await Promise.all(
      operatorKeys.map(async (operatorKey) => {
        const instance = new RegistryKey(operatorKey);
        return await this.repository.persist(instance);
      }),
    );

    await this.repository.flush();
    return result;
  }
}
