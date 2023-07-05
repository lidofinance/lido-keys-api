import { Entity, EntityRepositoryType, PrimaryKey, Property } from '@mikro-orm/core';
import { RegistryMetaRepository } from './meta.repository';

@Entity({ customRepository: () => RegistryMetaRepository })
export class RegistryMeta {
  [EntityRepositoryType]?: RegistryMetaRepository;

  constructor(meta: RegistryMeta) {
    this.blockNumber = meta.blockNumber;
    this.blockHash = meta.blockHash.toLocaleLowerCase();
    this.keysOpIndex = meta.keysOpIndex;
    this.timestamp = meta.timestamp;
  }

  @PrimaryKey()
  blockNumber!: number;

  @Property({ length: 66 })
  blockHash!: string;

  @Property()
  keysOpIndex!: number;

  @Property()
  timestamp!: number;
}
