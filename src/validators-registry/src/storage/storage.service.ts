import { ConsensusMeta, ConsensusValidatorsAndMetadata, Validator, Validators } from '../types';
import { ConsensusMetaEntity } from './consensus-meta.entity';
import { StorageServiceInterface } from './storage.service.interface';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { IsolationLevel, MikroORM, QueryOrder } from '@mikro-orm/core';
import { NUM_VALIDATORS_MAX_CHUNK } from '../constants';
import { ConsensusValidatorEntity } from './consensus-validator.entity';
import { chunk } from '@lido-nestjs/utils';
import { mapSet, parseAsTypeOrFail } from '../utils';
import { ConsensusDataInvalidError } from '../errors';
import { EntityManager } from '@mikro-orm/knex';
import { FindOptions, FilterQuery } from './interfaces';

@Injectable()
export class StorageService implements StorageServiceInterface, OnModuleDestroy {
  public constructor(protected readonly orm: MikroORM) {}

  public async onModuleDestroy(): Promise<void> {
    await this.orm.close();
  }

  protected get entityManager(): EntityManager {
    // It will automatically pick the request specific context under the hood, or use global entity manager
    return <EntityManager>this.orm.em;
  }

  public getEntityManager(): EntityManager {
    return this.entityManager;
  }

  /**
   * @inheritDoc
   */
  public async getConsensusMeta(): Promise<ConsensusMeta | null> {
    const metaEntities = await this.entityManager.getRepository(ConsensusMetaEntity).find(
      {},
      {
        orderBy: { blockNumber: QueryOrder.DESC },
        limit: 1,
      },
    );

    const metaEntity = metaEntities.pop();

    if (!metaEntity) {
      // default meta
      return null;
    }

    return {
      epoch: metaEntity.epoch,
      slot: metaEntity.slot,
      blockNumber: metaEntity.blockNumber,
      blockHash: metaEntity.blockHash,
      slotStateRoot: metaEntity.slotStateRoot,
      timestamp: metaEntity.timestamp,
    };
  }

  /**
   * @inheritDoc
   */
  public async updateValidatorsAndMeta(validators: Validator[], meta: ConsensusMeta): Promise<void> {
    return this.entityManager.transactional(
      async () => {
        await this.updateMeta(meta);
        await this.updateValidators(validators);
      },
      { isolationLevel: IsolationLevel.READ_COMMITTED },
    );
  }

  public async deleteValidators() {
    await this.orm.em.getRepository(ConsensusValidatorEntity).nativeDelete({});
  }

  public async updateValidators(validators: Validator[]): Promise<void> {
    const validatorsChecked = parseAsTypeOrFail(Validators, validators, (error) => {
      throw new ConsensusDataInvalidError('Got invalid Validators when writing to storage', error);
    });

    const validatorsPartitions = chunk(validatorsChecked, NUM_VALIDATORS_MAX_CHUNK);

    // remove all previous validators
    // await this.orm.em.getRepository(ConsensusValidatorEntity).nativeDelete({});

    const promises = validatorsPartitions.map((x) =>
      this.orm.em.getRepository(ConsensusValidatorEntity).createQueryBuilder().insert(x).execute(),
    );

    await Promise.all(promises);
  }

  /**
   * @inheritDoc
   */
  public async updateMeta(meta: ConsensusMeta): Promise<void> {
    const metaChecked = parseAsTypeOrFail(ConsensusMeta, meta, (error) => {
      throw new ConsensusDataInvalidError('Got invalid ConsensusMeta when writing to storage', error);
    });

    const metaEntity = new ConsensusMetaEntity(metaChecked);

    await this.entityManager.getRepository(ConsensusMetaEntity).upsert(metaEntity);
  }

  public async getValidators(
    pubkeys?: string[],
    where?: FilterQuery<ConsensusValidatorEntity>,
    options?: FindOptions<ConsensusValidatorEntity>,
  ): Promise<Validator[]> {
    const pubkeysSet = this.pubkeysToSet(pubkeys);

    const whereInPubkeys =
      pubkeysSet && pubkeysSet.size <= 100
        ? {
            pubkey: { $in: [...pubkeysSet.values()] },
          }
        : null;

    let qb = this.entityManager.createQueryBuilder(ConsensusValidatorEntity).where(where ?? {});

    if (whereInPubkeys) {
      qb = qb.andWhere(whereInPubkeys);
    }

    if (options && options.orderBy) {
      qb = qb.orderBy(options.orderBy);
    }

    const rawValidators: Validator[] = await qb.execute('all', false);

    const validators = rawValidators.map((v) => ({
      index: v.index,
      status: v.status,
      pubkey: v.pubkey,
    }));

    return pubkeysSet && whereInPubkeys === null ? validators.filter((v) => pubkeysSet.has(v.pubkey)) : validators;
  }

  /**
   * @inheritDoc
   */
  public async getValidatorsAndMeta(
    pubkeys?: string[],
    where?: FilterQuery<ConsensusValidatorEntity>,
    options?: FindOptions<ConsensusValidatorEntity>,
  ): Promise<ConsensusValidatorsAndMetadata> {
    return this.entityManager.transactional(
      async () => {
        const meta = await this.getConsensusMeta();

        if (meta === null) {
          return {
            meta,
            validators: [],
          };
        }

        const validators = await this.getValidators(pubkeys, where, options);

        return {
          meta,
          validators,
        };
      },
      { isolationLevel: IsolationLevel.REPEATABLE_READ },
    );
  }

  protected pubkeysToSet(pubkeys?: string[]) {
    return Array.isArray(pubkeys) ? mapSet(new Set(pubkeys), (s) => s.toLocaleLowerCase()) : null;
  }
}
