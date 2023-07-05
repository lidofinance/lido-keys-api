import { Entity, EntityRepositoryType, PrimaryKey, Property } from '@mikro-orm/core';
import { RegistryOperatorRepository } from './operator.repository';

@Entity({ customRepository: () => RegistryOperatorRepository })
export class RegistryOperator {
  [EntityRepositoryType]?: RegistryOperatorRepository;

  constructor(operator: RegistryOperator) {
    this.index = operator.index;
    this.active = operator.active;
    this.name = operator.name;
    this.rewardAddress = operator.rewardAddress.toLocaleLowerCase();
    this.stakingLimit = operator.stakingLimit;
    this.stoppedValidators = operator.stoppedValidators;
    this.totalSigningKeys = operator.totalSigningKeys;
    this.usedSigningKeys = operator.usedSigningKeys;
  }

  @PrimaryKey()
  index!: number;

  @Property()
  active!: boolean;

  @Property({ length: 256 })
  name!: string;

  @Property({ length: 42 })
  rewardAddress!: string;

  @Property()
  stakingLimit!: number;

  @Property()
  stoppedValidators!: number;

  @Property()
  totalSigningKeys!: number;

  @Property()
  usedSigningKeys!: number;
}
