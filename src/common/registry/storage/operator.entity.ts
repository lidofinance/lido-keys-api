import { Entity, EntityRepositoryType, PrimaryKey, PrimaryKeyType, Property } from '@mikro-orm/core';
import { ADDRESS_LEN } from './constants';
import { RegistryOperatorRepository } from './operator.repository';

@Entity({ customRepository: () => RegistryOperatorRepository })
export class RegistryOperator {
  [EntityRepositoryType]?: RegistryOperatorRepository;
  [PrimaryKeyType]?: [RegistryOperator['index'], RegistryOperator['moduleAddress']];

  constructor(operator: RegistryOperator) {
    this.index = operator.index;
    this.active = operator.active;
    this.name = operator.name;
    this.rewardAddress = operator.rewardAddress.toLocaleLowerCase();
    this.stakingLimit = operator.stakingLimit;
    this.stoppedValidators = operator.stoppedValidators;
    this.totalSigningKeys = operator.totalSigningKeys;
    this.usedSigningKeys = operator.usedSigningKeys;
    this.moduleAddress = operator.moduleAddress;
  }

  @PrimaryKey()
  index!: number;

  @Property()
  active!: boolean;

  @Property({ length: 256 })
  name!: string;

  @Property({ length: ADDRESS_LEN })
  rewardAddress!: string;

  @Property()
  stakingLimit!: number;

  @Property()
  stoppedValidators!: number;

  @Property()
  totalSigningKeys!: number;

  @Property()
  usedSigningKeys!: number;

  @PrimaryKey()
  @Property({ length: ADDRESS_LEN })
  moduleAddress!: string;
}
