import { Entity, EntityRepositoryType, PrimaryKey, PrimaryKeyType, Property } from '@mikro-orm/core';
import { DEPOSIT_SIGNATURE_LEN, MODULE_ADDRESS_LEN, KEY_LEN } from './constants';
import { RegistryKeyRepository } from './key.repository';

@Entity({ customRepository: () => RegistryKeyRepository })
export class RegistryKey {
  [EntityRepositoryType]?: RegistryKeyRepository;
  [PrimaryKeyType]?: [number, number, string];

  constructor(operatorKey: RegistryKey) {
    this.index = operatorKey.index;
    this.operatorIndex = operatorKey.operatorIndex;
    this.key = operatorKey.key.toLocaleLowerCase();
    this.depositSignature = operatorKey.depositSignature.toLocaleLowerCase();
    this.used = operatorKey.used;
    this.moduleAddress = operatorKey.moduleAddress;
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
  @Property({ length: MODULE_ADDRESS_LEN })
  moduleAddress!: string;
}
