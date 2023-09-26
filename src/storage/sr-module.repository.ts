import { EntityRepository } from '@mikro-orm/knex';
import { SrModuleEntity } from './sr-module.entity';

export class SRModuleRepository extends EntityRepository<SrModuleEntity> {}
