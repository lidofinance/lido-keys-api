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
import { ConsensusMetaEntity, ConsensusValidatorEntity, Validator } from '@lido-nestjs/validators-registry';

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
          entities: [
            RegistryKey,
            RegistryOperator,
            SrModuleEntity,
            ElMetaEntity,
            ConsensusValidatorEntity,
            ConsensusMetaEntity,
          ],
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
            max: 10,
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

  it('non consistent data', async () => {
    // run function that will change value of database in 10 seconds
    // initital 0x81011ad6ebe5c7844e59b1799e12de769f785f66df3f63debb06149c1782d574c8c2cd9c923fa881e9dcf6d413159863
    const changedKey =
      '0x000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
    const where = {};
    where['index'] = 1;
    where['operator_index'] = 1;
    where['module_address'] = '0x11a93807078f8bb880c1bd0ee4c387537de4b4b6';

    const registryKey = await storageService.find(where);

    const updatedRecord = { ...registryKey[0], key: changedKey };

    setTimeout(async () => {
      entityManager
        .createQueryBuilder(RegistryKey)
        .insert(updatedRecord)
        .onConflict(['index', 'operator_index', 'module_address'])
        .merge()
        .execute();

      console.log('Database updated successfully');
    }, 15_000);

    await entityManager.transactional(
      async () => {
        // transaction make snapshot on this command
        // this value we dont need
        await storageElModules.findAll();

        // check value of record index = 1 operator_index = 1
        const keysGenerator = await storageService.findStream(where, [
          'index',
          'operator_index as operatorIndex',
          'key',
          'deposit_signature as depositSignature',
          'used',
          'module_address as moduleAddress',
        ]);

        const firstResult = keysGenerator;
        let prevKey = 'initial value';

        for await (const value of firstResult) {
          prevKey = value.key;
          expect(prevKey).not.toBe(changedKey);
          expect(prevKey).not.toBe('initial value');
          break; // as we expect only one value index = 1 , operator_index = 1
        }

        console.log('before sleep');

        await sleep(20000);

        console.log('repeat read');

        const keysGeneratorSecond = await storageService.findStream(where, [
          'index',
          'operator_index as operatorIndex',
          'key',
          'deposit_signature as depositSignature',
          'used',
          'module_address as moduleAddress',
        ]);

        for await (const value of keysGeneratorSecond) {
          expect(value.key).toBe(changedKey); // value was changed
          expect(value.key).toBe(prevKey); // will got an error
          break; // as we expect only one value index = 1 , operator_index = 1
        }
      },
      { isolationLevel: IsolationLevel.REPEATABLE_READ },
    );
  }, 50_000);

  it('how transaction work with new version', async () => {
    // run function that will change value of database in 10 seconds
    // initital 0x81011ad6ebe5c7844e59b1799e12de769f785f66df3f63debb06149c1782d574c8c2cd9c923fa881e9dcf6d413159863
    const changedKey =
      '0x000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
    const where = {};
    where['index'] = 1;
    where['operator_index'] = 1;
    where['module_address'] = '0x11a93807078f8bb880c1bd0ee4c387537de4b4b6';

    const registryKey = await storageService.find(where);

    const updatedRecord = { ...registryKey[0], key: changedKey };

    setTimeout(async () => {
      entityManager
        .createQueryBuilder(RegistryKey)
        .insert(updatedRecord)
        .onConflict(['index', 'operator_index', 'module_address'])
        .merge()
        .execute();

      console.log('Database updated successfully');
    }, 15_000);

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
        // transaction make snapshot on this command
        // this value we dont need
        await storageElModules.findAll();

        const qb = em.createQueryBuilder(RegistryKey);
        qb.select(fields || '*').where(where);

        const knex = qb.getKnexQuery();

        const keysGenerator = knex
          .orderBy([
            { column: 'operatorIndex', order: 'asc' },
            { column: 'index', order: 'asc' },
          ])
          .stream();

        const firstResult = keysGenerator;
        let prevKey = 'initial value';

        for await (const value of firstResult) {
          prevKey = value.key;
          expect(prevKey).not.toBe(changedKey);
          expect(prevKey).not.toBe('initial value');
          break; // as we expect only one value index = 1 , operator_index = 1
        }

        console.log('before sleep');

        await sleep(20000);

        console.log('repeat read');

        const qb2 = em.createQueryBuilder(RegistryKey);
        qb2.select(fields || '*').where(where);

        const knex2 = qb2.getKnexQuery();

        const keysGenerator2 = knex2
          .orderBy([
            { column: 'operatorIndex', order: 'asc' },
            { column: 'index', order: 'asc' },
          ])
          .stream();

        for await (const value of keysGenerator2) {
          expect(value.key).toBe(prevKey); // was not changed
          expect(value.key).not.toBe(changedKey);
          break; // as we expect only one value index = 1 , operator_index = 1
        }
      },
      { isolationLevel: IsolationLevel.REPEATABLE_READ },
    );

    // check that value was changed
    const [key3] = await storageService.find(where);

    expect(key3).toEqual(updatedRecord);
  }, 50_000);
});
