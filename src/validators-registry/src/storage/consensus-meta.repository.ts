import { EntityRepository } from '@mikro-orm/knex';
import { ConsensusMetaEntity } from './consensus-meta.entity';

export class ConsensusMetaRepository extends EntityRepository<ConsensusMetaEntity> {
  public async upsert(entity: ConsensusMetaEntity): Promise<ConsensusMetaEntity> {
    await this.nativeDelete({});

    return await this.createQueryBuilder().insert(entity).execute();
  }
}
