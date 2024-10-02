import { Entity, EntityRepositoryType, PrimaryKey, PrimaryKeyType, Property } from '@mikro-orm/core';
import { DEPOSIT_SIGNATURE_LEN, ADDRESS_LEN, KEY_LEN } from './constants';
import { RegistryKeyRepository } from './key.repository';

@Entity({ customRepository: () => RegistryKeyRepository })
export class RegistryKey {
  [EntityRepositoryType]?: RegistryKeyRepository;
  [PrimaryKeyType]?: [RegistryKey['index'], RegistryKey['operatorIndex'], RegistryKey['moduleAddress']];

  constructor(operatorKey: RegistryKey) {
    this.index = operatorKey.index;
    this.operatorIndex = operatorKey.operatorIndex;
    this.key = operatorKey.key.toLocaleLowerCase();
    this.depositSignature = operatorKey.depositSignature.toLocaleLowerCase();
    this.used = operatorKey.used;
    this.moduleAddress = operatorKey.moduleAddress;
    this.vetted = operatorKey.vetted;
  }

  @PrimaryKey()
  index!: number;

  @PrimaryKey()
  operatorIndex!: number;

  @Property({ length: KEY_LEN })
  key!: string;

  @Property({ length: DEPOSIT_SIGNATURE_LEN })
  depositSignature!: string;

  @Property()
  used!: boolean;

  @PrimaryKey()
  @Property({ length: ADDRESS_LEN })
  moduleAddress!: string;

  @Property()
  vetted!: boolean;
}
