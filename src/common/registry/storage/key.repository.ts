import { EntityRepository } from '@mikro-orm/knex';
import { RegistryKey } from './key.entity';

export class RegistryKeyRepository extends EntityRepository<RegistryKey> {}
