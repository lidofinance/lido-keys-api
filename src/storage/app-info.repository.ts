import { EntityRepository } from '@mikro-orm/knex';
import { AppInfoEntity } from './app-info.entity';

export class AppInfoRepository extends EntityRepository<AppInfoEntity> {}
