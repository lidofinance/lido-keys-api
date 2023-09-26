import { EntityRepository } from '@mikro-orm/knex';
import { ElMetaEntity } from './el-meta.entity';

export class ElMetaRepository extends EntityRepository<ElMetaEntity> {}
