import { Entity, EntityRepositoryType, Index, PrimaryKey, Property, t } from '@mikro-orm/core';
import { Validator, ValidatorStatus } from '../types';
import { ConsensusValidatorRepository } from './consensus-validator.repository';

@Entity({
  tableName: 'consensus_validator',
  customRepository: () => ConsensusValidatorRepository,
})
export class ConsensusValidatorEntity implements Validator {
  [EntityRepositoryType]?: ConsensusValidatorRepository;

  @PrimaryKey({ type: t.string })
  pubkey!: string;

  @Property({ type: t.integer })
  @Index()
  index!: number;

  @Property()
  @Index()
  status!: ValidatorStatus;
}
