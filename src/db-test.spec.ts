/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test } from '@nestjs/testing';
import { INestApplication, Module } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/core';

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

@Module({
  imports: [
    ConfigModule,
    MikroOrmModule.forRootAsync({
      async useFactory(configService: ConfigService) {
        return {
          type: 'postgresql',
          entities: [RegistryKey, RegistryOperator],
          dbName: configService.get('DB_NAME'),
          host: configService.get('DB_HOST'),
          port: configService.get('DB_PORT'),
          user: configService.get('DB_USER'),
          password: configService.get('DB_PASSWORD'),
          autoLoadEntities: false,
          cache: { enabled: false },
          debug: false,
          registerRequestContext: true,
          allowGlobalContext: true,
          pool: {
            min: 1,
            max: 1,
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

  let entityManager: EntityManager;

  beforeEach(async () => {
    const imports = [DatabaseTestingModule, RegistryStorageModule.forFeature()];

    const moduleRef = await Test.createTestingModule({ imports }).compile();
    storageService = moduleRef.get(RegistryKeyStorageService);
    registryService = moduleRef.get(RegistryStorageService);

    entityManager = moduleRef.get(EntityManager);

    const generator = moduleRef.get(MikroORM).getSchemaGenerator();
    await generator.updateSchema();
  });

  // it('how transaction was created in kapi', async () => {
  //   await entityManager.transactional(async () => {
  //     const where = {};
  //     where['index'] = 1;
  //     where['operator_index'] = 1;

  //     const keysGenerator = await storageService.findStream(where, [
  //       'index',
  //       'operator_index as operatorIndex',
  //       'key',
  //       'deposit_signature as depositSignature',
  //       'used',
  //       'module_address as moduleAddress',
  //     ]);

  //     for await (const key of keysGenerator) {
  //       console.log(key);
  //     }
  //   });
  // }, 30000);

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

    await knex.transaction(async (tx) => {
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
    });
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

    await entityManager.transactional(async (em) => {
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
    });
  }, 30000);
});
