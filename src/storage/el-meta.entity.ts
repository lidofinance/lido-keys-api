import { Entity, EntityRepositoryType, PrimaryKey, PrimaryKeyProp, Property } from '@mikro-orm/core';
import { BLOCK_HASH_LEN } from './constants';
import { ElMetaRepository } from './el-meta.repository';

@Entity({ repository: () => ElMetaRepository })
export class ElMetaEntity {
  [EntityRepositoryType]?: ElMetaRepository;
  [PrimaryKeyProp]?: ['blockNumber', 'blockHash'];

  constructor(meta: ElMetaEntity) {
    this.blockNumber = meta.blockNumber;
    this.blockHash = meta.blockHash.toLocaleLowerCase();
    this.timestamp = meta.timestamp;
    this.lastChangedBlockHash = meta.lastChangedBlockHash;
  }

  @PrimaryKey()
  blockNumber: number;

  @PrimaryKey()
  @Property({ length: BLOCK_HASH_LEN })
  blockHash: string;

  @Property()
  timestamp: number;

  @Property({ length: BLOCK_HASH_LEN })
  lastChangedBlockHash: string;
}
