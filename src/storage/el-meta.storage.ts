import { QueryOrder } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import { ElMetaEntity } from './el-meta.entity';
import { ElMetaRepository } from './el-meta.repository';

@Injectable()
export class ElMetaStorageService {
  constructor(private readonly repository: ElMetaRepository) {}

  async get(): Promise<ElMetaEntity | null> {
    const result = await this.repository.find({}, { orderBy: { blockNumber: QueryOrder.DESC }, limit: 1 });
    return result[0] ?? null;
  }

  async update(currElMeta: { number: number; hash: string; timestamp: number }): Promise<void> {
    await this.repository.nativeDelete({});
    await this.repository.persist(
      new ElMetaEntity({
        blockHash: currElMeta.hash,
        blockNumber: currElMeta.number,
        timestamp: currElMeta.timestamp,
      }),
    );
  }
}
