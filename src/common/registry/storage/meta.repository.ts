import { EntityRepository } from '@mikro-orm/knex';
import { RegistryMeta } from './meta.entity';

export class RegistryMetaRepository extends EntityRepository<RegistryMeta> {}
