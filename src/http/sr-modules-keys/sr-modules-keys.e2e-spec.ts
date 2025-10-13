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
import { StakingRouterModule } from '../../staking-router-modules/staking-router.module';

import { SRModuleStorageService } from '../../storage/sr-module.storage';
import { ElMetaStorageService } from '../../storage/el-meta.storage';
import { nullTransport, LoggerModule } from '@lido-nestjs/logger';
import * as request from 'supertest';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { SRModulesKeysController } from './sr-modules-keys.controller';
import { SRModulesKeysService } from './sr-modules-keys.service';
import { curatedModule, dvtModule, keys } from '../db.fixtures';
import { dvtModuleResp, curatedModuleResp } from '../module.fixture';
import { curatedModuleKeysResponse, dvtModuleKeysResponse } from '../keys.fixtures';
import { elMeta } from '../el-meta.fixture';
import { DatabaseE2ETestingModule } from 'app';
import { CSMKeyRegistryService } from 'common/registry-csm';
import { AddressZero } from '@ethersproject/constants';

describe('SRModulesKeysController (e2e)', () => {
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

  const keysByModules = [
    {
      keys: dvtModuleKeysResponse,
      module: dvtModuleResp,
    },
    {
      keys: curatedModuleKeysResponse,
      module: curatedModuleResp,
    },
  ];

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

  @Global()
  @Module({
    imports: [RegistryStorageModule],
    providers: [CSMKeyRegistryService],
    exports: [CSMKeyRegistryService, RegistryStorageModule],
  })
  class CSMKeyRegistryModule {}

  class CSMKeysRegistryServiceMock {
    async update(moduleAddress, blockHash) {
      return;
    }
  }

  beforeAll(async () => {
    const imports = [
      DatabaseE2ETestingModule.forRoot(),
      LoggerModule.forRoot({ transports: [nullTransport()] }),
      KeyRegistryModule,
      CSMKeyRegistryModule,
      StakingRouterModule,
    ];

    const controllers = [SRModulesKeysController];
    const providers = [SRModulesKeysService];
    const moduleRef = await Test.createTestingModule({ imports, controllers, providers })
      .overrideProvider(KeyRegistryService)
      .useClass(KeysRegistryServiceMock)
      .overrideProvider(CSMKeyRegistryService)
      .useClass(CSMKeysRegistryServiceMock)
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

  describe('The /modules/{module_id}/keys request', () => {
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

      describe('without filters', () => {
        it('Should return all keys for request without filters', async () => {
          const resp = await request(app.getHttpServer()).get(`/v1/modules/${dvtModule.moduleId}/keys`);

          expect(resp.status).toEqual(200);
          expect(resp.body.data.keys).toEqual(expect.arrayContaining(dvtModuleKeysResponse));
          expect(resp.body.data.module).toEqual(dvtModuleResp);
          expect(resp.body.meta).toEqual({
            elBlockSnapshot: {
              blockNumber: elMeta.number,
              blockHash: elMeta.hash,
              timestamp: elMeta.timestamp,
              lastChangedBlockHash: elMeta.lastChangedBlockHash,
            },
          });
        });

        it('Should return all keys if query parameters provided as empty strings', async () => {
          const resp = await request(app.getHttpServer())
            .get(`/v1/modules/${dvtModule.moduleId}/keys`)
            .query({ used: '', operatorIndex: '' });

          expect(resp.status).toEqual(200);
          expect(resp.body.data.keys).toEqual(expect.arrayContaining(dvtModuleKeysResponse));
          expect(resp.body.data.module).toEqual(dvtModuleResp);
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

      describe('validate used filters', () => {
        it('Should return 400 error if used is integer value', async () => {
          const resp = await request(app.getHttpServer())
            .get(`/v1/modules/${dvtModule.moduleId}/keys`)
            .query({ used: 0, operatorIndex: 2 });
          expect(resp.status).toEqual(400);
          expect(resp.body).toEqual({
            error: 'Bad Request',
            message: ['used must be a boolean value'],
            statusCode: 400,
          });
        });

        it('Should return 400 error if used is wrong string value', async () => {
          const resp = await request(app.getHttpServer())
            .get(`/v1/modules/${dvtModule.moduleId}/keys`)
            .query({ used: 'something', operatorIndex: 2 });
          expect(resp.status).toEqual(400);
          expect(resp.body).toEqual({
            error: 'Bad Request',
            message: ['used must be a boolean value'],
            statusCode: 400,
          });
        });

        it('Should ignore used filter, if used provided as empty string', async () => {
          const resp = await request(app.getHttpServer())
            .get(`/v1/modules/${dvtModule.moduleId}/keys`)
            .query({ used: '', operatorIndex: 1 });

          const res = dvtModuleKeysResponse.filter((key) => key.operatorIndex === 1);

          expect(resp.status).toEqual(200);
          expect(resp.body.data.keys).toEqual(expect.arrayContaining(res));
          expect(resp.body.data.module).toEqual(dvtModuleResp);
          expect(resp.body.meta).toEqual({
            elBlockSnapshot: {
              blockNumber: elMeta.number,
              blockHash: elMeta.hash,
              timestamp: elMeta.timestamp,
              lastChangedBlockHash: elMeta.lastChangedBlockHash,
            },
          });
        });

        it('Should return 400 error if used is the string "undefined"', async () => {
          const resp = await request(app.getHttpServer())
            .get(`/v1/modules/${dvtModule.moduleId}/keys`)
            .query({ used: 'undefined' });

          expect(resp.status).toEqual(400);
          expect(resp.body).toEqual({
            error: 'Bad Request',
            message: ['used must be a boolean value'],
            statusCode: 400,
          });
        });
      });

      describe('validate operatorIndex filters', () => {
        it('Should return 400 error if operatorIndex is not a number', async () => {
          const resp = await request(app.getHttpServer())
            .get(`/v1/modules/${dvtModule.moduleId}/keys`)
            .query({ used: false, operatorIndex: 'one' });
          expect(resp.status).toEqual(400);
          expect(resp.body).toEqual({
            error: 'Bad Request',
            message: ['operatorIndex must not be less than 0', 'operatorIndex must be an integer number'],
            statusCode: 400,
          });
        });

        it('Should not filter by operatorIndex if operatorIndex provided as empty string', async () => {
          const resp = await request(app.getHttpServer())
            .get(`/v1/modules/${dvtModule.moduleId}/keys`)
            .query({ used: false, operatorIndex: '' });

          const expectedKeys = dvtModuleKeysResponse.filter((key) => !key.used);

          expect(resp.status).toEqual(200);
          expect(resp.body.data.keys).toEqual(expect.arrayContaining(expectedKeys));
          expect(resp.body.data.module).toEqual(dvtModuleResp);
          expect(resp.body.meta).toEqual({
            elBlockSnapshot: {
              blockNumber: elMeta.number,
              blockHash: elMeta.hash,
              timestamp: elMeta.timestamp,
              lastChangedBlockHash: elMeta.lastChangedBlockHash,
            },
          });
        });

        it('Should return 400 error if operatorIndex is a float', async () => {
          const resp = await request(app.getHttpServer())
            .get(`/v1/modules/${dvtModule.moduleId}/keys`)
            .query({ operatorIndex: 1.5 });

          expect(resp.status).toEqual(400);
          expect(resp.body).toEqual({
            error: 'Bad Request',
            message: ['operatorIndex must be an integer number'],
            statusCode: 400,
          });
        });

        it('Should return 400 error if operatorIndex is negative', async () => {
          const resp = await request(app.getHttpServer())
            .get(`/v1/modules/${dvtModule.moduleId}/keys`)
            .query({ operatorIndex: -1 });

          expect(resp.status).toEqual(400);
          expect(resp.body).toEqual({
            error: 'Bad Request',
            message: ['operatorIndex must not be less than 0'],
            statusCode: 400,
          });
        });

        it('Should return empty keys list for non-existent operator', async () => {
          const resp = await request(app.getHttpServer())
            .get(`/v1/modules/${dvtModule.moduleId}/keys`)
            .query({ operatorIndex: 777 });

          expect(resp.status).toEqual(200);
          expect(resp.body.data.keys).toEqual([]);
          expect(resp.body.data.module).toEqual(dvtModuleResp);
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

      describe('validate module id', () => {
        it('Should return 400 error if module_id is not a contract address or number', async () => {
          const resp = await request(app.getHttpServer()).get(`/v1/modules/sjdnsjkfsjkbfsjdfbdjfb/keys`);
          expect(resp.status).toEqual(400);
          expect(resp.body).toEqual({
            error: 'Bad Request',
            message: ['module_id must be a contract address or numeric value'],
            statusCode: 400,
          });
        });

        it('Should return 400 error if module_id is not set', async () => {
          const resp = await request(app.getHttpServer()).get(`/v1/modules//keys`);
          expect(resp.status).toEqual(400);
          expect(resp.body).toEqual({
            error: 'Bad Request',
            message: ['module_id must be a contract address or numeric value'],
            statusCode: 400,
          });
        });

        it("Should return 404 if module doesn't exist", async () => {
          const resp = await request(app.getHttpServer()).get('/v1/modules/777/keys');
          expect(resp.status).toEqual(404);
          expect(resp.body).toEqual({
            error: 'Not Found',
            message: 'Module with moduleId 777 is not supported',
            statusCode: 404,
          });
        });

        it('Should return 400 error if module_id is not set', async () => {
          const resp = await request(app.getHttpServer()).get(`/v1/modules/${AddressZero}/keys`);
          expect(resp.status).toEqual(400);
          expect(resp.body).toEqual({
            error: 'Bad Request',
            message: ['module_id cannot be the zero address'],
            statusCode: 400,
          });
        });
      });

      describe('combined used + operatorIndex filters', () => {
        it('Should return used keys for operator one', async () => {
          const resp = await request(app.getHttpServer())
            .get(`/v1/modules/${dvtModule.moduleId}/keys`)
            .query({ used: true, operatorIndex: 1 });

          const expectedKeys = dvtModuleKeysResponse.filter((key) => key.used && key.operatorIndex == 1);

          expect(resp.status).toEqual(200);
          expect(resp.body.data.keys).toEqual(expect.arrayContaining(expectedKeys));
          expect(resp.body.data.module).toEqual(dvtModuleResp);
          expect(resp.body.meta).toEqual({
            elBlockSnapshot: {
              blockNumber: elMeta.number,
              blockHash: elMeta.hash,
              timestamp: elMeta.timestamp,
              lastChangedBlockHash: elMeta.lastChangedBlockHash,
            },
          });
        });

        it('Should return unused keys for operator one', async () => {
          const resp = await request(app.getHttpServer())
            .get(`/v1/modules/${dvtModule.moduleId}/keys`)
            .query({ used: false, operatorIndex: 1 });

          const expectedKeys = dvtModuleKeysResponse.filter((key) => !key.used && key.operatorIndex == 1);

          expect(resp.status).toEqual(200);
          expect(resp.body.data.keys).toEqual(expect.arrayContaining(expectedKeys));
          expect(resp.body.data.module).toEqual(dvtModuleResp);
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
    });

    describe('too early response case', () => {
      beforeEach(async () => {
        await cleanDB();
      });
      afterEach(async () => {
        await cleanDB();
      });

      it('Should return too early response if there are no meta', async () => {
        await moduleStorageService.upsert(dvtModule, 1, '');
        const resp = await request(app.getHttpServer()).get(`/v1/modules/${dvtModule.moduleId}/keys`);
        expect(resp.status).toEqual(425);
        expect(resp.body).toEqual({ message: 'Too early response', statusCode: 425 });
      });
    });
  });

  describe('The /modules/{module_id}/keys/find', () => {
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

      describe('validate module id', () => {
        it('Should return 400 error if module_id is not a contract address or number', async () => {
          const pubkeys = [dvtModuleKeysResponse[0].key, dvtModuleKeysResponse[1].key];

          const resp = await request(app.getHttpServer())
            .post(`/v1/modules/sjdnsjkfsjkbfsjdfbdjfb/keys/find`)
            .send({ pubkeys });
          expect(resp.status).toEqual(400);
          expect(resp.body).toEqual({
            error: 'Bad Request',
            message: ['module_id must be a contract address or numeric value'],
            statusCode: 400,
          });
        });

        it('Should return 400 error if module_id is not set', async () => {
          const pubkeys = [dvtModuleKeysResponse[0].key, dvtModuleKeysResponse[1].key];

          const resp = await request(app.getHttpServer()).post(`/v1/modules//keys/find`).send({ pubkeys });
          expect(resp.status).toEqual(400);
          expect(resp.body).toEqual({
            error: 'Bad Request',
            message: ['module_id must be a contract address or numeric value'],
            statusCode: 400,
          });
        });

        it("Should return 404 if module doesn't exist", async () => {
          const pubkeys = [dvtModuleKeysResponse[0].key, dvtModuleKeysResponse[1].key];

          const resp = await request(app.getHttpServer()).post('/v1/modules/777/keys/find').send({ pubkeys });
          expect(resp.status).toEqual(404);
          expect(resp.body).toEqual({
            error: 'Not Found',
            message: 'Module with moduleId 777 is not supported',
            statusCode: 404,
          });
        });

        it('Should return 400 error if module_id is not set', async () => {
          const pubkeys = [dvtModuleKeysResponse[0].key, dvtModuleKeysResponse[1].key];
          const resp = await request(app.getHttpServer())
            .post(`/v1/modules/${AddressZero}/keys/find`)
            .send({ pubkeys });
          expect(resp.status).toEqual(400);
          expect(resp.body).toEqual({
            error: 'Bad Request',
            message: ['module_id cannot be the zero address'],
            statusCode: 400,
          });
        });
      });

      describe('validate pubkeys', () => {
        it('Should return all keys that satisfy the request', async () => {
          const pubkeys = [dvtModuleKeysResponse[0].key, dvtModuleKeysResponse[1].key];

          const resp = await request(app.getHttpServer())
            .post(`/v1/modules/${dvtModule.moduleId}/keys/find`)
            .set('Content-Type', 'application/json')
            .send({ pubkeys });

          expect(resp.status).toEqual(200);
          expect(resp.body.data.keys).toEqual(
            expect.arrayContaining([dvtModuleKeysResponse[0], dvtModuleKeysResponse[1]]),
          );
          expect(resp.body.data.module).toEqual(dvtModuleResp);
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
          const pubkeys = [curatedModuleKeysResponse[0].key];

          const resp = await request(app.getHttpServer())
            .post(`/v1/modules/${dvtModule.moduleId}/keys/find`)
            .set('Content-Type', 'application/json')
            .send({ pubkeys });

          expect(resp.status).toEqual(200);
          expect(resp.body.data.keys).toEqual([]);
          expect(resp.body.data.module).toEqual(dvtModuleResp);
          expect(resp.body.meta).toEqual({
            elBlockSnapshot: {
              blockNumber: elMeta.number,
              blockHash: elMeta.hash,
              timestamp: elMeta.timestamp,
              lastChangedBlockHash: elMeta.lastChangedBlockHash,
            },
          });
        });

        it('Should return 400 error if pubkeys list was not provided', async () => {
          const resp = await request(app.getHttpServer())
            .post(`/v1/modules/${dvtModule.moduleId}/keys/find`)
            .set('Content-Type', 'application/json')
            .send({ pubkeys: [] });

          expect(resp.status).toEqual(400);
          expect(resp.body).toEqual({
            error: 'Bad Request',
            message: ['pubkeys must contain at least 1 elements'],
            statusCode: 400,
          });
        });

        it('Should return 400 error if pubkeys list contains not only string values', async () => {
          const resp = await request(app.getHttpServer())
            .post(`/v1/modules/${dvtModule.moduleId}/keys/find`)
            .set('Content-Type', 'application/json')
            .send({ pubkeys: [3, 'sdsdsd'] });

          expect(resp.status).toEqual(400);
          expect(resp.body).toEqual({
            error: 'Bad Request',
            message: ['Each pubkey must be a valid 0x-prefixed 48-byte hex string'],
            statusCode: 400,
          });
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

      it('Should return too early response if there are no meta', async () => {
        await moduleStorageService.upsert(dvtModule, 1, '');
        const resp = await request(app.getHttpServer())
          .post(`/v1/modules/${dvtModule.moduleId}/keys/find`)
          .set('Content-Type', 'application/json')
          .send({ pubkeys: [dvtModuleKeysResponse[0].key] });
        expect(resp.status).toEqual(425);
        expect(resp.body).toEqual({ message: 'Too early response', statusCode: 425 });
      });
    });
  });

  describe('The /modules/keys request', () => {
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

      describe('without filters', () => {
        it('Should return all keys for request without filters', async () => {
          const resp = await request(app.getHttpServer()).get(`/v1/modules/keys`);

          expect(resp.status).toEqual(200);
          expect(resp.body.data).toEqual(expect.arrayContaining(keysByModules));
          expect(resp.body.meta).toEqual({
            elBlockSnapshot: {
              blockNumber: elMeta.number,
              blockHash: elMeta.hash,
              timestamp: elMeta.timestamp,
              lastChangedBlockHash: elMeta.lastChangedBlockHash,
            },
          });
        });

        it('Should return all keys if query parameters provided as empty strings', async () => {
          const resp = await request(app.getHttpServer())
            .get(`/v1/modules/keys`)
            .query({ used: '', operatorIndex: '' });

          expect(resp.status).toEqual(200);
          expect(resp.body.data).toEqual(expect.arrayContaining(keysByModules));
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

      describe('validate operatorIndex filters', () => {
        it('Should return 400 error if operatorIndex is not a number', async () => {
          const resp = await request(app.getHttpServer())
            .get(`/v1/modules/keys`)
            .query({ used: false, operatorIndex: 'one' });
          expect(resp.status).toEqual(400);
          expect(resp.body).toEqual({
            error: 'Bad Request',
            message: ['operatorIndex must not be less than 0', 'operatorIndex must be an integer number'],
            statusCode: 400,
          });
        });

        it('Should return used keys for operator one', async () => {
          const resp = await request(app.getHttpServer())
            .get(`/v1/modules/keys`)
            .query({ used: true, operatorIndex: 1 });

          const expectedKeysDvt = dvtModuleKeysResponse.filter((key) => key.used && key.operatorIndex == 1);
          const expectedKeysCurated = curatedModuleKeysResponse.filter((key) => key.used && key.operatorIndex == 1);

          expect(resp.status).toEqual(200);
          expect(resp.body.data).toEqual(
            expect.arrayContaining([
              { keys: expectedKeysDvt, module: dvtModuleResp },
              { keys: expectedKeysCurated, module: curatedModuleResp },
            ]),
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

        it('Should return unused keys for operator one', async () => {
          const resp = await request(app.getHttpServer())
            .get(`/v1/modules/keys`)
            .query({ used: false, operatorIndex: 1 });

          const expectedKeysDvt = dvtModuleKeysResponse.filter((key) => !key.used && key.operatorIndex == 1);
          const expectedKeysCurated = curatedModuleKeysResponse.filter((key) => !key.used && key.operatorIndex == 1);

          expect(resp.status).toEqual(200);
          expect(resp.body.data).toEqual(
            expect.arrayContaining([
              { keys: expectedKeysDvt, module: dvtModuleResp },
              { keys: expectedKeysCurated, module: curatedModuleResp },
            ]),
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

        it('Should not filter by operatorIndex if operatorIndex provided as empty string', async () => {
          const resp = await request(app.getHttpServer()).get(`/v1/modules/keys`).query({ operatorIndex: '' });

          expect(resp.status).toEqual(200);
          expect(resp.body.data).toEqual(expect.arrayContaining(keysByModules));
          expect(resp.body.meta).toEqual({
            elBlockSnapshot: {
              blockNumber: elMeta.number,
              blockHash: elMeta.hash,
              timestamp: elMeta.timestamp,
              lastChangedBlockHash: elMeta.lastChangedBlockHash,
            },
          });
        });

        it('Should return empty keys lists for non-existent operator', async () => {
          const resp = await request(app.getHttpServer()).get(`/v1/modules/keys`).query({ operatorIndex: 777 });

          expect(resp.status).toEqual(200);
          expect(resp.body.data).toEqual([
            { keys: [], module: dvtModuleResp },
            { keys: [], module: curatedModuleResp },
          ]);
          expect(resp.body.meta).toEqual({
            elBlockSnapshot: {
              blockNumber: elMeta.number,
              blockHash: elMeta.hash,
              timestamp: elMeta.timestamp,
              lastChangedBlockHash: elMeta.lastChangedBlockHash,
            },
          });
        });

        it('Should return 400 error if operatorIndex is a float', async () => {
          const resp = await request(app.getHttpServer()).get(`/v1/modules/keys`).query({ operatorIndex: 1.5 });

          expect(resp.status).toEqual(400);
          expect(resp.body).toEqual({
            error: 'Bad Request',
            message: ['operatorIndex must be an integer number'],
            statusCode: 400,
          });
        });

        it('Should return 400 error if operatorIndex is negative', async () => {
          const resp = await request(app.getHttpServer()).get(`/v1/modules/keys`).query({ operatorIndex: -1 });

          expect(resp.status).toEqual(400);
          expect(resp.body).toEqual({
            error: 'Bad Request',
            message: ['operatorIndex must not be less than 0'],
            statusCode: 400,
          });
        });
      });

      describe('validate used filters', () => {
        it('Should return 400 error if used is not a boolean value', async () => {
          const resp = await request(app.getHttpServer()).get(`/v1/modules/keys`).query({ used: 0, operatorIndex: 2 });
          expect(resp.status).toEqual(400);
          expect(resp.body).toEqual({
            error: 'Bad Request',
            message: ['used must be a boolean value'],
            statusCode: 400,
          });
        });

        it('Should return 400 error if used is wrong string value', async () => {
          const resp = await request(app.getHttpServer())
            .get(`/v1/modules/keys`)
            .query({ used: 'something', operatorIndex: 2 });
          expect(resp.status).toEqual(400);
          expect(resp.body).toEqual({
            error: 'Bad Request',
            message: ['used must be a boolean value'],
            statusCode: 400,
          });
        });

        it('Should ignore used filter, if used provided as empty string', async () => {
          const resp = await request(app.getHttpServer()).get(`/v1/modules/keys`).query({ used: '' });

          expect(resp.status).toEqual(200);
          expect(resp.body.data).toEqual(expect.arrayContaining(keysByModules));
          expect(resp.body.meta).toEqual({
            elBlockSnapshot: {
              blockNumber: elMeta.number,
              blockHash: elMeta.hash,
              timestamp: elMeta.timestamp,
              lastChangedBlockHash: elMeta.lastChangedBlockHash,
            },
          });
        });

        it('Should return 400 error if used is the string "undefined"', async () => {
          const resp = await request(app.getHttpServer()).get(`/v1/modules/keys`).query({ used: 'undefined' });

          expect(resp.status).toEqual(400);
          expect(resp.body).toEqual({
            error: 'Bad Request',
            message: ['used must be a boolean value'],
            statusCode: 400,
          });
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

      it('Should return too early response if there are no meta', async () => {
        await moduleStorageService.upsert(dvtModule, 1, '');
        const resp = await request(app.getHttpServer()).get(`/v1/modules/keys`);
        expect(resp.status).toEqual(425);
        expect(resp.body).toEqual({ message: 'Too early response', statusCode: 425 });
      });
    });
  });
});
