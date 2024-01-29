/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test } from '@nestjs/testing';
import { INestApplication, Module } from '@nestjs/common';
import { IsolationLevel, MikroORM } from '@mikro-orm/core';

import { ConfigModule, ConfigService } from 'common/config';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import {
  RegistryKey,
  RegistryKeyStorageService,
  RegistryOperator,
  RegistryStorageModule,
  RegistryStorageService,
} from 'common/registry';
import { EntityManager } from '@mikro-orm/knex';
import { StorageModule } from 'storage/storage.module';
import { SRModuleStorageService } from 'storage/sr-module.storage';
import { SrModuleEntity } from 'storage/sr-module.entity';
import { ElMetaEntity } from 'storage/el-meta.entity';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Module({
  imports: [
    ConfigModule,
    MikroOrmModule.forRootAsync({
      async useFactory(configService: ConfigService) {
        return {
          type: 'postgresql',
          entities: [RegistryKey, RegistryOperator, SrModuleEntity, ElMetaEntity],
          dbName: configService.get('DB_NAME'),
          host: configService.get('DB_HOST'),
          port: configService.get('DB_PORT'),
          user: configService.get('DB_USER'),
          password: configService.get('DB_PASSWORD'),
          autoLoadEntities: false,
          cache: { enabled: false },
          debug: true,
          registerRequestContext: true,
          allowGlobalContext: true,
          pool: {
            min: 1,
            max: 2,
            acquireTimeoutMillis: 20000,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseTestingModule {}

describe('KeyController (e2e)', () => {
  let storageService: RegistryKeyStorageService;
  let registryService: RegistryStorageService;
  let storageElModules: SRModuleStorageService;
  let entityManager: EntityManager;

  beforeEach(async () => {
    const imports = [DatabaseTestingModule, StorageModule, RegistryStorageModule.forFeature()];

    const moduleRef = await Test.createTestingModule({ imports }).compile();
    storageService = moduleRef.get(RegistryKeyStorageService);
    registryService = moduleRef.get(RegistryStorageService);
    storageElModules = moduleRef.get(SRModuleStorageService);

    entityManager = moduleRef.get(EntityManager);

    const generator = moduleRef.get(MikroORM).getSchemaGenerator();
    await generator.updateSchema();
  });

  it('how transaction was created in kapi', async () => {
    try {
      await entityManager.transactional(async (em) => {
        const where = {};
        where['index'] = 1;
        where['operator_index'] = 1;

        const result = await em.execute('select txid_current()');

        console.log('explicit transaction id: ', result);

        const keysGenerator = await storageService.findStream(where, [
          'index',
          'operator_index as operatorIndex',
          'key',
          'deposit_signature as depositSignature',
          'used',
          'module_address as moduleAddress',
        ]);

        for await (const key of keysGenerator) {
          console.log(key);
        }
      });
    } catch (error) {
      // Handle the error here. You can log it or make assertions if this is for a test.
      console.error('Transaction failed:', error);
      // Optionally, you might want to fail the test explicitly if an error occurs.
      throw error;
    }
  }, 30000);

  it('get knex from conn', async () => {
    const where = {};
    where['index'] = 1;
    where['operator_index'] = 1;

    const fields = [
      'index',
      'operator_index as operatorIndex',
      'key',
      'deposit_signature as depositSignature',
      'used',
      'module_address as moduleAddress',
    ];

    const knex = entityManager.getKnex();

    await knex.transaction(
      async (tx) => {
        const stream = tx
          .select(fields || '*')
          .from<RegistryKey>('registry_key')
          .where(where)
          .orderBy([
            { column: 'operatorIndex', order: 'asc' },
            { column: 'index', order: 'asc' },
          ])
          .stream();

        for await (const key of stream) {
          console.log(key);
        }

        // await sleep(20000);
      },
      { isolationLevel: IsolationLevel.REPEATABLE_READ },
    );
  }, 30000);

  it('get query builder', async () => {
    const where = {};
    where['index'] = 1;
    where['operator_index'] = 1;

    const fields = [
      'index',
      'operator_index as operatorIndex',
      'key',
      'deposit_signature as depositSignature',
      'used',
      'module_address as moduleAddress',
    ];

    await entityManager.transactional(
      async (em) => {
        const qb = em.createQueryBuilder(RegistryKey);
        qb.select(fields || '*').where(where);

        const knex = qb.getKnexQuery();

        const stream = knex
          .orderBy([
            { column: 'operatorIndex', order: 'asc' },
            { column: 'index', order: 'asc' },
          ])
          .stream();

        for await (const key of stream) {
          console.log(key);
        }
      },
      { isolationLevel: IsolationLevel.REPEATABLE_READ },
    );
  }, 30000);

  it('find check', async () => {
    await entityManager.transactional(async (em) => {
      const keys = await storageService.find({ index: 1 });

      console.log(keys);
    });
  }, 30000);

  it('findStreamV2', async () => {
    const where = {};
    where['index'] = 1;
    where['operator_index'] = 1;

    const fields = [
      'index',
      'operator_index as operatorIndex',
      'key',
      'deposit_signature as depositSignature',
      'used',
      'module_address as moduleAddress',
    ];

    await entityManager.transactional(
      async (em) => {
        const result = await em.execute('select txid_current()');

        console.log('explicit transaction id: ', result);

        const stream = storageService.findStreamV2(where, fields);

        for await (const key of stream) {
          console.log('key:', key);
        }
      },
      { isolationLevel: IsolationLevel.REPEATABLE_READ },
    );
  }, 30_000);

  it('getKnex', async () => {
    try {
      await entityManager.transactional(async (em) => {
        const where = {};
        where['index'] = 1;
        where['operator_index'] = 1;

        const result = await em.execute('select txid_current()');

        console.log('explicit transaction id: ', result);

        const knexData = await em.getKnex().raw('select txid_current()');

        console.log('getKnex result:', knexData);
      });
    } catch (error) {
      // Handle the error here. You can log it or make assertions if this is for a test.
      console.error('Transaction failed:', error);
      // Optionally, you might want to fail the test explicitly if an error occurs.
      throw error;
    }
  }, 30000);
});
