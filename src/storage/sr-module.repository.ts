import { EntityRepository } from '@mikro-orm/knex';
import { SRModuleEntity } from './sr-module.entity';

export class SRModuleRepository extends EntityRepository<SRModuleEntity> {}
