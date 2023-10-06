import { EntityRepository } from '@mikro-orm/knex';
import { ConsensusValidatorEntity } from './consensus-validator.entity';

export class ConsensusValidatorRepository extends EntityRepository<ConsensusValidatorEntity> {}
