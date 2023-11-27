import { EntityRepository } from '@mikro-orm/knex';
import { RegistryOperator } from './operator.entity';

export class RegistryOperatorRepository extends EntityRepository<RegistryOperator> {}
