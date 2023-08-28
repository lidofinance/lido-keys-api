import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { RegistryKeyStorageService, RegistryStorageService } from '../../common/registry';
import { MikroORM } from '@mikro-orm/core';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { KeysController } from './keys.controller';
import { StakingRouterModule } from '../../staking-router-modules/staking-router.module';
import { key } from './key.fixture';
import { dvtModule, curatedModule } from '../../storage/module.fixture';
import { SRModuleStorageService } from '../../storage/sr-module.storage';
import { ElMetaStorageService } from '../../storage/el-meta.storage';
import { KeysService } from './keys.service';
import { BatchProviderModule, ExtendedJsonRpcBatchProvider } from '@lido-nestjs/execution';
import { nullTransport, LoggerModule } from '@lido-nestjs/logger';

import * as request from 'supertest';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
// import { validationOpt } from '../../main';

describe('KeyController (e2e)', () => {
  let app: INestApplication;

  let keysStorageService: RegistryKeyStorageService;
  let moduleStorageService: SRModuleStorageService;
  let elMetaStorageService: ElMetaStorageService;
  let keysService: KeysService;
  let registryStorage: RegistryStorageService;

  const elMeta = {
    number: 74,
    hash: '0x662e3e713207240b25d01324b6eccdc91493249a5048881544254994694530a5',
    timestamp: 1691500803,
  };

  const operatorOneUsedKeys = [
    { operatorIndex: 1, index: 1, moduleAddress: dvtModule.stakingModuleAddress, ...key, used: true },
    { operatorIndex: 1, index: 1, moduleAddress: curatedModule.stakingModuleAddress, ...key, used: true },
    { operatorIndex: 1, index: 2, moduleAddress: curatedModule.stakingModuleAddress, ...key, used: true },
  ];

  const operatorOneUnusedKeys = [
    { operatorIndex: 1, index: 2, moduleAddress: dvtModule.stakingModuleAddress, ...key, used: false },
    { operatorIndex: 1, index: 3, moduleAddress: curatedModule.stakingModuleAddress, ...key, used: false },
  ];

  const operatorTwoUsedKeys = [
    { operatorIndex: 2, index: 4, moduleAddress: curatedModule.stakingModuleAddress, ...key, used: true },
    { operatorIndex: 2, index: 5, moduleAddress: curatedModule.stakingModuleAddress, ...key, used: true },
  ];

  // primary key: operatorIndex, index, moduleAddress
  const keys = [...operatorOneUsedKeys, ...operatorOneUnusedKeys, ...operatorTwoUsedKeys];

  async function cleanDB() {
    await keysStorageService.removeAll();
    await moduleStorageService.removeAll();
    await elMetaStorageService.removeAll();
  }

  beforeAll(async () => {
    const imports = [
      //  sqlite3 only supports serializable transactions, ignoring the isolation level param
      // TODO: use postgres
      MikroOrmModule.forRoot({
        dbName: ':memory:',
        type: 'sqlite',
        allowGlobalContext: true,
        entities: ['./**/*.entity.ts'],
      }),
      LoggerModule.forRoot({ transports: [nullTransport()] }),
      // TODO: mock provider
      BatchProviderModule.forRoot({ url: process.env.PROVIDERS_URLS as string }),
      StakingRouterModule.forFeatureAsync({
        inject: [ExtendedJsonRpcBatchProvider],
        async useFactory(provider) {
          return { provider };
        },
      }),
    ];

    const controllers = [KeysController];
    const providers = [KeysService];

    const moduleRef = await Test.createTestingModule({ imports, controllers, providers }).compile();

    elMetaStorageService = moduleRef.get(ElMetaStorageService);
    keysStorageService = moduleRef.get(RegistryKeyStorageService);
    moduleStorageService = moduleRef.get(SRModuleStorageService);
    keysService = moduleRef.get(KeysService);
    registryStorage = moduleRef.get(RegistryStorageService);

    const generator = moduleRef.get(MikroORM).getSchemaGenerator();
    await generator.updateSchema();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.enableVersioning({ type: VersioningType.URI });
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await registryStorage.onModuleDestroy();
    await app.getHttpAdapter().close();
    await app.close();
  });

  describe('The /keys requests', () => {
    describe('requests with filters', () => {
      beforeAll(async () => {
        // lets save meta
        await elMetaStorageService.update(elMeta);

        // lets save keys
        await keysStorageService.save(keys);

        // lets save modules
        await moduleStorageService.store(dvtModule, 1);
        await moduleStorageService.store(curatedModule, 1);
      });

      afterAll(async () => {
        await cleanDB();
      });

      it('should return all keys for request without filters', async () => {
        // Get all keys without filters
        const resp = await request(app.getHttpServer()).get('/v1/keys');

        expect(resp.status).toEqual(200);
        expect(resp.body.data.length).toEqual(keys.length);
        expect(resp.body.data).toEqual(expect.arrayContaining(keys));
        expect(resp.body.meta).toEqual({
          elBlockSnapshot: {
            blockNumber: elMeta.number,
            blockHash: elMeta.hash,
            timestamp: elMeta.timestamp,
          },
        });
      });

      it('should return used keys', async () => {
        const resp = await request(app.getHttpServer()).get('/v1/keys').query({ used: true });

        expect(resp.status).toEqual(200);
        expect(resp.body.data.length).toEqual([...operatorOneUsedKeys, ...operatorTwoUsedKeys].length);
        expect(resp.body.data).toEqual(expect.arrayContaining([...operatorOneUsedKeys, ...operatorTwoUsedKeys]));
        expect(resp.body.meta).toEqual({
          elBlockSnapshot: {
            blockNumber: elMeta.number,
            blockHash: elMeta.hash,
            timestamp: elMeta.timestamp,
          },
        });
      });

      it('should return unused keys', async () => {
        const resp = await request(app.getHttpServer()).get('/v1/keys').query({ used: false });

        expect(resp.status).toEqual(200);
        expect(resp.body.data.length).toEqual(operatorOneUnusedKeys.length);
        expect(resp.body.data).toEqual(expect.arrayContaining(operatorOneUnusedKeys));
        expect(resp.body.meta).toEqual({
          elBlockSnapshot: {
            blockNumber: elMeta.number,
            blockHash: elMeta.hash,
            timestamp: elMeta.timestamp,
          },
        });
      });

      it('should return used keys for operator 1', async () => {
        const resp = await request(app.getHttpServer()).get('/v1/keys').query({ used: true, operatorIndex: 1 });

        expect(resp.status).toEqual(200);
        expect(resp.body.data.length).toEqual(operatorOneUsedKeys.length);
        expect(resp.body.data).toEqual(expect.arrayContaining(operatorOneUsedKeys));
        expect(resp.body.meta).toEqual({
          elBlockSnapshot: {
            blockNumber: elMeta.number,
            blockHash: elMeta.hash,
            timestamp: elMeta.timestamp,
          },
        });
      });

      it('should return unused keys for operator 1', async () => {
        const resp = await request(app.getHttpServer()).get('/v1/keys').query({ used: false, operatorIndex: 1 });

        expect(resp.status).toEqual(200);
        expect(resp.body.data.length).toEqual(operatorOneUnusedKeys.length);
        expect(resp.body.data).toEqual(expect.arrayContaining(operatorOneUnusedKeys));
        expect(resp.body.meta).toEqual({
          elBlockSnapshot: {
            blockNumber: elMeta.number,
            blockHash: elMeta.hash,
            timestamp: elMeta.timestamp,
          },
        });
      });

      it('should return an empty list of keys for unused keys request with operator 2', async () => {
        const resp = await request(app.getHttpServer()).get('/v1/keys').query({ used: false, operatorIndex: 2 });

        expect(resp.status).toEqual(200);
        expect(resp.body.data.length).toEqual(0);
        expect(resp.body.meta).toEqual({
          elBlockSnapshot: {
            blockNumber: elMeta.number,
            blockHash: elMeta.hash,
            timestamp: elMeta.timestamp,
          },
        });
      });

      it('should return 400 error if operatorIndex is not a number', async () => {
        const resp = await request(app.getHttpServer()).get('/v1/keys').query({ used: false, operatorIndex: 'one' });
        expect(resp.status).toEqual(400);
        expect(resp.body).toEqual({
          error: 'Bad Request',
          message: ['operatorIndex must not be less than 0', 'operatorIndex must be an integer number'],
          statusCode: 400,
        });
      });

      it('should return 400 error if used is not a boolean value', async () => {
        const resp = await request(app.getHttpServer()).get('/v1/keys').query({ used: 0, operatorIndex: 2 });
        expect(resp.status).toEqual(400);
        expect(resp.body).toEqual({ error: 'Bad Request', message: ['used must be a boolean value'], statusCode: 400 });
      });

      // it('should ignore unknown values in query', async () => {
      //   // I think this test doesn't work because of old fastify version, smth wrong with forbidUnknownValues, need to update nestjs
      //   const getMock = jest.spyOn(keysService, 'get');
      //   const resp = await request(app.getHttpServer())
      //     .get('/v1/keys')
      //     .query({ wrongParam: 1, used: true, operatorIndex: 1 });

      //   expect(resp.status).toEqual(200);
      //   expect(getMock).toBeCalledWith({ used: true, operatorIndex: 1 });
      // });

      it('should return empty list if operator doesnt exist', async () => {
        const resp = await request(app.getHttpServer()).get('/v1/keys').query({ operatorIndex: 3 });
        expect(resp.status).toEqual(200);
        expect(resp.body.data.length).toEqual(0);
        expect(resp.body.meta).toEqual({
          elBlockSnapshot: {
            blockNumber: elMeta.number,
            blockHash: elMeta.hash,
            timestamp: elMeta.timestamp,
          },
        });
      });
    });

    describe('too early response case', () => {
      beforeEach(async () => {
        await cleanDB();
      });

      afterEach(async () => {
        await cleanDB();
      });

      it('should return too early response if there are no modules in database', async () => {
        // lets save meta
        await elMetaStorageService.update(elMeta);

        // lets save keys
        await keysStorageService.save(keys);

        const resp = await request(app.getHttpServer()).get('/v1/keys');
        expect(resp.status).toEqual(425);
        expect(resp.body).toEqual({ message: 'Too early response', statusCode: 425 });
      });

      it('should return too early response if there are no meta', async () => {
        // lets save keys
        await keysStorageService.save(keys);

        await moduleStorageService.store(curatedModule, 1);

        const resp = await request(app.getHttpServer()).get('/v1/keys');
        expect(resp.status).toEqual(425);
        expect(resp.body).toEqual({ message: 'Too early response', statusCode: 425 });
      });
    });
  });

  // describe('The /keys/{pubkey} requests', () => {
  //   it('', async () => {});
  // });
});
