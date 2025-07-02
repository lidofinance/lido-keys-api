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
import { nullTransport, LoggerModule } from '@lido-nestjs/logger';
import * as request from 'supertest';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { elMeta } from '../el-meta.fixture';
import { curatedKeyWithDuplicate, curatedModule, curatedModuleKeys, dvtModule, keys } from '../db.fixtures';
import { curatedModuleKeysResponse, dvtModuleKeysResponse } from 'http/keys.fixtures';
import { DatabaseE2ETestingModule } from 'app';
import { CSMKeyRegistryService } from 'common/registry-csm';

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

    const controllers = [KeysController];
    const providers = [KeysService];
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

      describe('without filters', () => {
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
      });

      describe('used + operatorIndex validation', () => {
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
      });

      describe('validate operatorIndex', () => {
        it('should return 400 error if operatorIndex is not a number', async () => {
          const resp = await request(app.getHttpServer()).get('/v1/keys').query({ used: false, operatorIndex: 'one' });
          expect(resp.status).toEqual(400);
          expect(resp.body).toEqual({
            error: 'Bad Request',
            message: ['operatorIndex must not be less than 0', 'operatorIndex must be an integer number'],
            statusCode: 400,
          });
        });

        it('should return 400 error if operatorIndex is a negative value', async () => {
          const resp = await request(app.getHttpServer()).get('/v1/keys').query({ used: false, operatorIndex: -1 });
          expect(resp.status).toEqual(400);
          expect(resp.body).toEqual({
            error: 'Bad Request',
            message: ['operatorIndex must not be less than 0'],
            statusCode: 400,
          });
        });

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

        it('Should return 400 error if operatorIndex is a float', async () => {
          const resp = await request(app.getHttpServer()).get('/v1/keys').query({ operatorIndex: 1.5 });

          expect(resp.status).toEqual(400);
          expect(resp.body).toEqual({
            error: 'Bad Request',
            message: ['operatorIndex must be an integer number'],
            statusCode: 400,
          });
        });
        it('Should not filter by operatorIndex if operatorIndex provided as empty string', async () => {
          const resp = await request(app.getHttpServer()).get('/v1/keys').query({ operatorIndex: '' });

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
      });

      describe('validate used filter', () => {
        it('should return 400 error if used is not a boolean value', async () => {
          const resp = await request(app.getHttpServer()).get('/v1/keys').query({ used: 0, operatorIndex: 2 });
          expect(resp.status).toEqual(400);
          expect(resp.body).toEqual({
            error: 'Bad Request',
            message: ['used must be a boolean value'],
            statusCode: 400,
          });
        });

        it('Should return 400 error if used is wrong string value', async () => {
          const resp = await request(app.getHttpServer())
            .get('/v1/keys')
            .query({ used: 'somethingwrong', operatorIndex: 2 });
          expect(resp.status).toEqual(400);
          expect(resp.body).toEqual({
            error: 'Bad Request',
            message: ['used must be a boolean value'],
            statusCode: 400,
          });
        });

        it('Should ignore used filter, if used provided as empty string', async () => {
          const resp = await request(app.getHttpServer()).get('/v1/keys').query({ used: '', operatorIndex: 1 });

          const curatedModuleKeys = curatedModuleKeysResponse.filter((key) => key.operatorIndex == 1);
          const dvtModuleKeys = dvtModuleKeysResponse.filter((key) => key.operatorIndex == 1);

          expect(resp.status).toEqual(200);
          expect(resp.body.data.length).toEqual([...curatedModuleKeys, ...dvtModuleKeys].length);
          expect(resp.body.data).toEqual(expect.arrayContaining([...curatedModuleKeys, ...dvtModuleKeys]));
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
          const resp = await request(app.getHttpServer()).get('/v1/keys').query({ used: 'undefined' });

          expect(resp.status).toEqual(400);
          expect(resp.body).toEqual({
            error: 'Bad Request',
            message: ['used must be a boolean value'],
            statusCode: 400,
          });
        });
      });

      describe('validate moduleAddresses', () => {
        it('should return only keys from dvtModule if one module address is provided', async () => {
          const resp = await request(app.getHttpServer()).get('/v1/keys').query({
            moduleAddresses: dvtModule.stakingModuleAddress,
          });

          expect(resp.status).toEqual(200);
          expect(resp.body.data.length).toEqual(dvtModuleKeysResponse.length);
          expect(resp.body.data).toEqual(expect.arrayContaining(dvtModuleKeysResponse));
          expect(resp.body.meta).toEqual({
            elBlockSnapshot: {
              blockNumber: elMeta.number,
              blockHash: elMeta.hash,
              timestamp: elMeta.timestamp,
              lastChangedBlockHash: elMeta.lastChangedBlockHash,
            },
          });
        });

        it('should return keys from both modules if both addresses are provided', async () => {
          const resp = await request(app.getHttpServer())
            .get('/v1/keys')
            .query({
              moduleAddresses: [dvtModule.stakingModuleAddress, curatedModule.stakingModuleAddress],
            });

          const expectedKeys = [...dvtModuleKeysResponse, ...curatedModuleKeysResponse];
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

        it('should return empty list if module address does not exist', async () => {
          const resp = await request(app.getHttpServer())
            .get('/v1/keys')
            .query({ moduleAddresses: '0x0000000000000000000000000000000000001234' });

          expect(resp.status).toEqual(200);
          expect(resp.body.data).toEqual([]);
          expect(resp.body.meta).toEqual({
            elBlockSnapshot: {
              blockNumber: elMeta.number,
              blockHash: elMeta.hash,
              timestamp: elMeta.timestamp,
              lastChangedBlockHash: elMeta.lastChangedBlockHash,
            },
          });
        });

        it('should handle empty string as moduleAddresses and ignore the filter', async () => {
          const resp = await request(app.getHttpServer()).get('/v1/keys').query({
            moduleAddresses: '',
          });

          const expectedKeys = [...dvtModuleKeysResponse, ...curatedModuleKeysResponse];
          expect(resp.status).toEqual(400);
          expect(resp.body).toEqual({
            error: 'Bad Request',
            message: ['Each value must be a valid address'],
            statusCode: 400,
          });
        });

        it('should be case agnostic', async () => {
          const uppercased = dvtModule.stakingModuleAddress.toUpperCase();
          const resp = await request(app.getHttpServer()).get('/v1/keys').query({
            moduleAddresses: uppercased,
          });

          expect(resp.status).toEqual(200);
          expect(resp.body.data.length).toEqual(dvtModuleKeysResponse.length);
          expect(resp.body.data).toEqual(expect.arrayContaining(dvtModuleKeysResponse));
          expect(resp.body.meta).toEqual({
            elBlockSnapshot: {
              blockNumber: elMeta.number,
              blockHash: elMeta.hash,
              timestamp: elMeta.timestamp,
              lastChangedBlockHash: elMeta.lastChangedBlockHash,
            },
          });
        });

        it('should return 400 if moduleAddresses is not a string or array of strings', async () => {
          const resp = await request(app.getHttpServer()).get('/v1/keys').query({ moduleAddresses: 12345 });

          expect(resp.status).toEqual(400);
          expect(resp.body).toEqual({
            error: 'Bad Request',
            message: ['Each value must be a valid address'],
            statusCode: 400,
          });
        });
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
        const pubkeys = [
          '0xb554bc44d9eacbf4dd6a2d6087b43f4c67fd5618651b97effcb30997bf49e5d7acf0100ef14e5d087cc228bc78d498e8',
        ];

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

      it('Should return 400 error if pubkeys list contains not only string values', async () => {
        const resp = await request(app.getHttpServer())
          .post(`/v1/keys/find`)
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
        const resp = await request(app.getHttpServer()).get(`/v1/keys/${curatedKeyWithDuplicate.key}`);
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

      it('should return 400 if key is not valid pubkey', async () => {
        const resp = await request(app.getHttpServer()).get(`/v1/keys/someunknownkey`);
        expect(resp.status).toEqual(400);
        expect(resp.body).toEqual({
          error: 'Bad Request',
          message: ['Each pubkey must be a valid 0x-prefixed 48-byte hex string'],
          statusCode: 400,
        });
      });
    });
  });
});
