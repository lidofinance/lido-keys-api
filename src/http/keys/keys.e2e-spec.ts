/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test } from '@nestjs/testing';
import { Global, INestApplication, Module, ValidationPipe, VersioningType } from '@nestjs/common';
import {
  KeyRegistryService,
  RegistryKeyStorageService,
  RegistryStorageModule,
  RegistryStorageService,
} from '../../common/registry';
import { MikroORM } from '@mikro-orm/core';
import { KeysController } from './keys.controller';
import { StakingRouterModule } from '../../staking-router-modules/staking-router.module';

import { SRModuleStorageService } from '../../storage/sr-module.storage';
import { ElMetaStorageService } from '../../storage/el-meta.storage';
import { KeysService } from './keys.service';
import { nullTransport, LoggerModule } from '@catalist-nestjs/logger';
import * as request from 'supertest';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { elMeta } from '../el-meta.fixture';
import { curatedKeyWithDuplicate, curatedModule, curatedModuleKeys, dvtModule, keys } from '../db.fixtures';
import { curatedModuleKeysResponse, dvtModuleKeysResponse } from 'http/keys.fixtures';
import { DatabaseE2ETestingModule } from 'app';

describe('KeyController (e2e)', () => {
  let app: INestApplication;

  let keysStorageService: RegistryKeyStorageService;
  let moduleStorageService: SRModuleStorageService;
  let elMetaStorageService: ElMetaStorageService;
  let registryStorage: RegistryStorageService;

  async function cleanDB() {
    await keysStorageService.removeAll();
    await moduleStorageService.removeAll();
    await elMetaStorageService.removeAll();
  }

  @Global()
  @Module({
    imports: [RegistryStorageModule],
    providers: [KeyRegistryService],
    exports: [KeyRegistryService, RegistryStorageModule],
  })
  class KeyRegistryModule {}

  class KeysRegistryServiceMock {
    async update(moduleAddress, blockHash) {
      return;
    }
  }

  beforeAll(async () => {
    const imports = [
      DatabaseE2ETestingModule.forRoot(),
      LoggerModule.forRoot({ transports: [nullTransport()] }),
      KeyRegistryModule,
      StakingRouterModule,
    ];

    const controllers = [KeysController];
    const providers = [KeysService];
    const moduleRef = await Test.createTestingModule({ imports, controllers, providers })
      .overrideProvider(KeyRegistryService)
      .useClass(KeysRegistryServiceMock)
      .compile();

    elMetaStorageService = moduleRef.get(ElMetaStorageService);
    keysStorageService = moduleRef.get(RegistryKeyStorageService);
    moduleStorageService = moduleRef.get(SRModuleStorageService);
    registryStorage = moduleRef.get(RegistryStorageService);

    const generator = moduleRef.get(MikroORM).getSchemaGenerator();
    await generator.refreshDatabase();
    await generator.clearDatabase();

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
    describe('api ready to work', () => {
      beforeAll(async () => {
        // lets save meta
        await elMetaStorageService.update(elMeta);
        // lets save keys
        await keysStorageService.save(keys);

        // lets save modules
        await moduleStorageService.upsert(dvtModule, 1, '');
        await moduleStorageService.upsert(curatedModule, 1, '');
      });

      afterAll(async () => {
        await cleanDB();
      });

      it('should return all keys for request without filters', async () => {
        // Get all keys without filters
        const resp = await request(app.getHttpServer()).get('/v1/keys');

        expect(resp.status).toEqual(200);
        expect(resp.body.data.length).toEqual(keys.length);
        expect(resp.body.data).toEqual(
          expect.arrayContaining([...curatedModuleKeysResponse, ...dvtModuleKeysResponse]),
        );
        expect(resp.body.meta).toEqual({
          elBlockSnapshot: {
            blockNumber: elMeta.number,
            blockHash: elMeta.hash,
            timestamp: elMeta.timestamp,
            lastChangedBlockHash: elMeta.lastChangedBlockHash,
          },
        });
      });

      it('should return used keys', async () => {
        const resp = await request(app.getHttpServer()).get('/v1/keys').query({ used: true });

        const expectedKeys = [...curatedModuleKeysResponse, ...dvtModuleKeysResponse].filter((key) => key.used);

        expect(resp.status).toEqual(200);
        expect(resp.body.data.length).toEqual(expectedKeys.length);
        expect(resp.body.data).toEqual(expect.arrayContaining(expectedKeys));
        expect(resp.body.meta).toEqual({
          elBlockSnapshot: {
            blockNumber: elMeta.number,
            blockHash: elMeta.hash,
            timestamp: elMeta.timestamp,
            lastChangedBlockHash: elMeta.lastChangedBlockHash,
          },
        });
      });

      it('should return unused keys', async () => {
        const resp = await request(app.getHttpServer()).get('/v1/keys').query({ used: false });
        const expectedKeys = [...curatedModuleKeysResponse, ...dvtModuleKeysResponse].filter((key) => !key.used);

        expect(resp.status).toEqual(200);
        expect(resp.body.data.length).toEqual(expectedKeys.length);
        expect(resp.body.data).toEqual(expect.arrayContaining(expectedKeys));
        expect(resp.body.meta).toEqual({
          elBlockSnapshot: {
            blockNumber: elMeta.number,
            blockHash: elMeta.hash,
            timestamp: elMeta.timestamp,
            lastChangedBlockHash: elMeta.lastChangedBlockHash,
          },
        });
      });

      it('should return used keys for operator 1', async () => {
        const resp = await request(app.getHttpServer()).get('/v1/keys').query({ used: true, operatorIndex: 1 });
        const expectedKeys = [...curatedModuleKeysResponse, ...dvtModuleKeysResponse].filter(
          (key) => key.used && key.operatorIndex == 1,
        );

        expect(resp.status).toEqual(200);
        expect(resp.body.data.length).toEqual(expectedKeys.length);
        expect(resp.body.data).toEqual(expect.arrayContaining(expectedKeys));
        expect(resp.body.meta).toEqual({
          elBlockSnapshot: {
            blockNumber: elMeta.number,
            blockHash: elMeta.hash,
            timestamp: elMeta.timestamp,
            lastChangedBlockHash: elMeta.lastChangedBlockHash,
          },
        });
      });

      it('should return unused keys for operator 1', async () => {
        const resp = await request(app.getHttpServer()).get('/v1/keys').query({ used: false, operatorIndex: 1 });
        const expectedKeys = [...dvtModuleKeysResponse, ...curatedModuleKeysResponse].filter(
          (key) => !key.used && key.operatorIndex == 1,
        );

        expect(resp.status).toEqual(200);
        expect(resp.body.data.length).toEqual(expectedKeys.length);
        expect(resp.body.data).toEqual(expect.arrayContaining(expectedKeys));
        expect(resp.body.meta).toEqual({
          elBlockSnapshot: {
            blockNumber: elMeta.number,
            blockHash: elMeta.hash,
            timestamp: elMeta.timestamp,
            lastChangedBlockHash: elMeta.lastChangedBlockHash,
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
            lastChangedBlockHash: elMeta.lastChangedBlockHash,
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

      it("should return empty list if operator doesn't exist", async () => {
        const resp = await request(app.getHttpServer()).get('/v1/keys').query({ operatorIndex: 3 });
        expect(resp.status).toEqual(200);
        expect(resp.body.data.length).toEqual(0);
        expect(resp.body.meta).toEqual({
          elBlockSnapshot: {
            blockNumber: elMeta.number,
            blockHash: elMeta.hash,
            timestamp: elMeta.timestamp,
            lastChangedBlockHash: elMeta.lastChangedBlockHash,
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

      it('should return too early response if there are no meta', async () => {
        // lets save keys
        await keysStorageService.save(keys);

        await moduleStorageService.upsert(curatedModule, 1, '');

        const resp = await request(app.getHttpServer()).get('/v1/keys');
        expect(resp.status).toEqual(425);
        expect(resp.body).toEqual({ message: 'Too early response', statusCode: 425 });
      });
    });
  });

  describe('The /v1/keys/find requests', () => {
    describe('too early response case', () => {
      beforeEach(async () => {
        await cleanDB();
      });

      afterEach(async () => {
        await cleanDB();
      });

      it('should return too early response if there are no meta', async () => {
        // lets save keys
        await keysStorageService.save(keys);
        await moduleStorageService.upsert(curatedModule, 1, '');
        const pubkeys = [keys[0].key, keys[1].key];
        const resp = await request(app.getHttpServer())
          .post(`/v1/keys/find`)
          .set('Content-Type', 'application/json')
          .send({ pubkeys });
        expect(resp.status).toEqual(425);
        expect(resp.body).toEqual({ message: 'Too early response', statusCode: 425 });
      });
    });

    describe('api ready to work', () => {
      beforeAll(async () => {
        // lets save meta
        await elMetaStorageService.update(elMeta);

        // lets save keys
        await keysStorageService.save(keys);

        // lets save modules
        await moduleStorageService.upsert(dvtModule, 1, '');
        await moduleStorageService.upsert(curatedModule, 1, '');
      });

      afterAll(async () => {
        await cleanDB();
      });

      it('should return all keys that satisfy the request', async () => {
        // Get all keys without filters
        const pubkeys = [curatedModuleKeys[0].key, curatedModuleKeys[1].key, curatedKeyWithDuplicate.key];

        const expectedResp = curatedModuleKeysResponse.filter((curatedKey) => pubkeys.includes(curatedKey.key));

        const resp = await request(app.getHttpServer())
          .post('/v1/keys/find')
          .set('Content-Type', 'application/json')
          .send({ pubkeys });

        expect(resp.status).toEqual(200);
        // as pubkeys contains 3 elements and keyForOperatorTwo has a duplicate
        expect(resp.body.data.length).toEqual(4);
        expect(resp.body.data).toEqual(expect.arrayContaining(expectedResp));
        expect(resp.body.meta).toEqual({
          elBlockSnapshot: {
            blockNumber: elMeta.number,
            blockHash: elMeta.hash,
            timestamp: elMeta.timestamp,
            lastChangedBlockHash: elMeta.lastChangedBlockHash,
          },
        });
      });

      it('Should return an empty list if no keys satisfy the request', async () => {
        // Get all keys without filters
        const pubkeys = ['somerandomkey'];

        const resp = await request(app.getHttpServer())
          .post('/v1/keys/find')
          .set('Content-Type', 'application/json')
          .send({ pubkeys });

        expect(resp.status).toEqual(200);
        expect(resp.body.data.length).toEqual(0);
        expect(resp.body.meta).toEqual({
          elBlockSnapshot: {
            blockNumber: elMeta.number,
            blockHash: elMeta.hash,
            timestamp: elMeta.timestamp,
            lastChangedBlockHash: elMeta.lastChangedBlockHash,
          },
        });
      });

      it('should return validation error if pubkeys list was not provided', async () => {
        const resp = await request(app.getHttpServer())
          .post('/v1/keys/find')
          .set('Content-Type', 'application/json')
          .send({ pubkeys: [] });

        expect(resp.status).toEqual(400);
        expect(resp.body).toEqual({
          error: 'Bad Request',
          message: ['pubkeys must contain at least 1 elements'],
          statusCode: 400,
        });
      });
    });
  });

  describe('The /v1/keys/{pubkey} requests', () => {
    describe('too early response case', () => {
      beforeEach(async () => {
        await cleanDB();
      });

      afterEach(async () => {
        await cleanDB();
      });

      it('should return too early response if there are no meta', async () => {
        // lets save keys
        await keysStorageService.save(keys);
        await moduleStorageService.upsert(curatedModule, 1, '');
        const resp = await request(app.getHttpServer()).get(`/v1/keys/wrongkey`);
        expect(resp.status).toEqual(425);
        expect(resp.body).toEqual({ message: 'Too early response', statusCode: 425 });
      });
    });

    describe('api ready to work', () => {
      beforeAll(async () => {
        // lets save meta
        await elMetaStorageService.update(elMeta);
        // lets save keys
        await keysStorageService.save(keys);
        // lets save modules
        await moduleStorageService.upsert(dvtModule, 1, '');
        await moduleStorageService.upsert(curatedModule, 1, '');
      });

      afterAll(async () => {
        await cleanDB();
      });

      it('should return all keys that satisfy the request', async () => {
        const resp = await request(app.getHttpServer()).get(`/v1/keys/${curatedKeyWithDuplicate.key}`);
        expect(resp.status).toEqual(200);
        const expectedResp = curatedModuleKeysResponse.filter(
          (curatedKey) => curatedKeyWithDuplicate.key == curatedKey.key,
        );

        // as pubkeys contains 3 elements and keyForOperatorTwo has a duplicate
        expect(resp.body.data.length).toEqual(2);
        expect(resp.body.data).toEqual(expect.arrayContaining(expectedResp));
        expect(resp.body.meta).toEqual({
          elBlockSnapshot: {
            blockNumber: elMeta.number,
            blockHash: elMeta.hash,
            timestamp: elMeta.timestamp,
            lastChangedBlockHash: elMeta.lastChangedBlockHash,
          },
        });
      });

      it('should return 404 if key was not found', async () => {
        const resp = await request(app.getHttpServer()).get(`/v1/keys/someunknownkey`);
        expect(resp.status).toEqual(404);
        expect(resp.body).toEqual({
          error: 'Not Found',
          message: 'There are no keys with someunknownkey public key in db.',
          statusCode: 404,
        });
      });
    });
  });
});
