import { Injectable } from '@nestjs/common';
import { QueryOrder } from '@mikro-orm/core';
import { RegistryMeta } from './meta.entity';
import { RegistryMetaRepository } from './meta.repository';

@Injectable()
export class RegistryMetaStorageService {
  constructor(private readonly repository: RegistryMetaRepository) {}

  /** returns meta */
  async get(): Promise<RegistryMeta | null> {
    const result = await this.repository.find({}, { orderBy: { blockNumber: QueryOrder.DESC }, limit: 1 });
    return result[0] ?? null;
  }

  /** removes meta */
  async remove() {
    return await this.repository.nativeDelete({});
  }

  /** saves meta */
  async save(registryMeta: RegistryMeta) {
    const metaData = new RegistryMeta(registryMeta);
    return await this.repository.persistAndFlush(metaData);
  }
}
