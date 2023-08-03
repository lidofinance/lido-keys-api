import { QueryOrder } from '@mikro-orm/core';
import { FilterQuery, FindOptions } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import { KeyField } from 'staking-router-modules/interfaces/key-fields';
import { RegistryKey } from './key.entity';
import { RegistryKeyRepository } from './key.repository';

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

  async *fetchKeysByChunks(where: FilterQuery<RegistryKey>, options: any): AsyncGenerator<any, void, unknown> {
    const batchSize = 10000;
    let offset = 0;
    // TODO: transaction - transaction already at controller level
    while (true) {
      // TODO: method find can work with limit offset
      const query = this.repository.createQueryBuilder().select('*').where(where).limit(batchSize).offset(offset);

      const chunk = await query.execute();

      if (chunk.length === 0) {
        break;
      }

      offset += batchSize;

      for (const record of chunk) {
        yield record;
      }
    }
  }

  /** find all keys */
  async findAll(): Promise<RegistryKey[]> {
    return await this.repository.findAll({
      orderBy: [{ operatorIndex: QueryOrder.ASC }, { index: QueryOrder.ASC }],
    });
  }

  /** find used keys */
  async findUsed(): Promise<RegistryKey[]> {
    return await this.repository.find({ used: true });
  }

  /** find all keys by operator */
  async findByOperatorIndex(operatorIndex: number): Promise<RegistryKey[]> {
    return await this.repository.find({ operatorIndex });
  }

  /** find key by pubkey */
  async findByPubkey(key: string): Promise<RegistryKey[]> {
    return await this.repository.find({ key: key.toLocaleLowerCase() });
  }

  /** find key by signature */
  async findBySignature(depositSignature: string): Promise<RegistryKey[]> {
    depositSignature = depositSignature.toLocaleLowerCase();
    return await this.repository.find({ depositSignature });
  }

  /** find key by index */
  async findOneByIndex(operatorIndex: number, keyIndex: number): Promise<RegistryKey | null> {
    return await this.repository.findOne({ operatorIndex, index: keyIndex });
  }

  /** removes key by index */
  async removeOneByIndex(operatorIndex: number, keyIndex: number) {
    return await this.repository.nativeDelete({
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
