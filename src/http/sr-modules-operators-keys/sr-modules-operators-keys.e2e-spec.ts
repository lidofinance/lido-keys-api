/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test } from '@nestjs/testing';
import { Global, INestApplication, Module, ValidationPipe, VersioningType } from '@nestjs/common';
import {
  KeyRegistryService,
  RegistryKeyStorageService,
  RegistryOperatorStorageService,
  RegistryStorageModule,
  RegistryStorageService,
} from '../../common/registry';
import { MikroORM } from '@mikro-orm/core';
import { SRModulesOperatorsKeysController } from './sr-modules-operators-keys.controller';
import { StakingRouterModule } from '../../staking-router-modules/staking-router.module';

import { SRModuleStorageService } from '../../storage/sr-module.storage';
import { ElMetaStorageService } from '../../storage/el-meta.storage';
import { SRModulesOperatorsKeysService } from './sr-modules-operators-keys.service';
import { nullTransport, LoggerModule } from '@lido-nestjs/logger';

import * as request from 'supertest';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';

import { curatedModuleResp, dvtModuleResp } from '../module.fixture';
import { elMeta } from '../el-meta.fixture';
import { keys, operators, dvtModule, curatedModule } from '../db.fixtures';
import { curatedModuleKeysResponse, dvtModuleKeysResponse } from '../keys.fixtures';
import { curatedOperatorsResp, dvtOperatorsResp } from '../operator.fixtures';
import { DatabaseE2ETestingModule } from 'app';
import { ModulesOperatorsKeysRecord } from './sr-modules-operators-keys.types';
import { CSMKeyRegistryService } from 'common/registry-csm';
import { AddressZero } from '@ethersproject/constants';

describe('SRModulesOperatorsKeysController (e2e)', () => {
  let app: INestApplication;

  let keysStorageService: RegistryKeyStorageService;
  let operatorsStorageService: RegistryOperatorStorageService;
  let moduleStorageService: SRModuleStorageService;
  let elMetaStorageService: ElMetaStorageService;
  let registryStorage: RegistryStorageService;

  async function cleanDB() {
    await keysStorageService.removeAll();
    await operatorsStorageService.removeAll();
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

    const controllers = [SRModulesOperatorsKeysController];
    const providers = [SRModulesOperatorsKeysService];
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
    operatorsStorageService = moduleRef.get(RegistryOperatorStorageService);

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

  describe('The /v1/modules/:module_id/operators/keys request', () => {
    describe('api ready to work', () => {
      beforeAll(async () => {
        // lets save meta
        await elMetaStorageService.update(elMeta);
        // lets save keys
        await keysStorageService.save(keys);
        // lets save operators
        await operatorsStorageService.save(operators);
        // lets save modules
        await moduleStorageService.upsert(dvtModule, 1, '');
        await moduleStorageService.upsert(curatedModule, 1, '');
      });

      afterAll(async () => {
        await cleanDB();
      });

      describe('without filters', () => {
        it('should return all keys for request without filters by module id', async () => {
          const resp = await request(app.getHttpServer()).get(`/v1/modules/${dvtModule.moduleId}/operators/keys`);

          expect(resp.status).toEqual(200);
          expect(resp.body.data.operators).toEqual(expect.arrayContaining(dvtOperatorsResp));
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

        it('should return all keys for request without filters by module address', async () => {
          const resp = await request(app.getHttpServer()).get(
            `/v1/modules/${dvtModule.stakingModuleAddress}/operators/keys`,
          );
          expect(resp.status).toEqual(200);
          expect(resp.body.data.operators).toEqual(expect.arrayContaining(dvtOperatorsResp));
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

      describe('validate operatorIndex', () => {
        it('should return 400 error if operatorIndex is not a number', async () => {
          const resp = await request(app.getHttpServer())
            .get(`/v1/modules/${dvtModule.moduleId}/operators/keys`)
            .query({ used: false, operatorIndex: 'one' });
          expect(resp.status).toEqual(400);
          expect(resp.body).toEqual({
            error: 'Bad Request',
            message: ['operatorIndex must not be less than 0', 'operatorIndex must be an integer number'],
            statusCode: 400,
          });
        });

        it('should return 400 error if operatorIndex is negative value', async () => {
          const resp = await request(app.getHttpServer())
            .get(`/v1/modules/${dvtModule.moduleId}/operators/keys`)
            .query({ used: false, operatorIndex: -1 });
          expect(resp.status).toEqual(400);
          expect(resp.body).toEqual({
            error: 'Bad Request',
            message: ['operatorIndex must not be less than 0'],
            statusCode: 400,
          });
        });

        it('Should return 400 error if operatorIndex is a float', async () => {
          const resp = await request(app.getHttpServer())
            .get(`/v1/modules/${dvtModule.moduleId}/operators/keys`)
            .query({ operatorIndex: 1.5 });

          expect(resp.status).toEqual(400);
          expect(resp.body).toEqual({
            error: 'Bad Request',
            message: ['operatorIndex must be an integer number'],
            statusCode: 400,
          });
        });

        it('should return empty keys and operators lists for non-existent operator', async () => {
          const resp = await request(app.getHttpServer())
            .get(`/v1/modules/${dvtModule.moduleId}/operators/keys`)
            .query({ operatorIndex: 0 });

          expect(resp.status).toEqual(200);
          expect(resp.body.data.operators).toEqual([]);
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

        it('Should not filter by operatorIndex if operatorIndex provided as empty string', async () => {
          const resp = await request(app.getHttpServer())
            .get(`/v1/modules/${dvtModule.moduleId}/operators/keys`)
            .query({ used: '', operatorIndex: '' });

          expect(resp.status).toEqual(200);
          expect(resp.body.data.operators).toEqual(expect.arrayContaining(dvtOperatorsResp));
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

      describe('used and operatorIndex filters', () => {
        it('should return used keys for operator one', async () => {
          const resp = await request(app.getHttpServer())
            .get(`/v1/modules/${dvtModule.moduleId}/operators/keys`)
            .query({ used: true, operatorIndex: 1 });

          const expectedKeys = dvtModuleKeysResponse.filter((key) => key.used && key.operatorIndex == 1);
          const expectedOperators = dvtOperatorsResp.filter((op) => op.index == 1);

          expect(resp.status).toEqual(200);
          expect(resp.body.data.operators).toEqual(expect.arrayContaining(expectedOperators));
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

        it('should return unused keys for operator one', async () => {
          const resp = await request(app.getHttpServer())
            .get(`/v1/modules/${dvtModule.moduleId}/operators/keys`)
            .query({ used: false, operatorIndex: 1 });

          const expectedKeys = dvtModuleKeysResponse.filter((key) => !key.used && key.operatorIndex == 1);
          const expectedOperators = dvtOperatorsResp.filter((op) => op.index == 1);

          expect(resp.status).toEqual(200);
          expect(resp.body.data.operators).toEqual(expect.arrayContaining(expectedOperators));
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

      describe('validate used filter', () => {
        it('should return 400 error if used is not a boolean value', async () => {
          const resp = await request(app.getHttpServer())
            .get(`/v1/modules/${dvtModule.moduleId}/operators/keys`)
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
            .get(`/v1/modules/${dvtModule.moduleId}/operators/keys`)
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
            .get(`/v1/modules/${dvtModule.moduleId}/operators/keys`)
            .query({ used: '', operatorIndex: 1 });

          const expectedKeys = dvtModuleKeysResponse.filter((key) => key.operatorIndex == 1);
          const expectedOperators = dvtOperatorsResp.filter((op) => op.index == 1);

          expect(resp.status).toEqual(200);
          expect(resp.body.data.operators).toEqual(expect.arrayContaining(expectedOperators));
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

        it('Should return 400 error if used is the string "undefined"', async () => {
          const resp = await request(app.getHttpServer())
            .get(`/v1/modules/${dvtModule.moduleId}/operators/keys`)
            .query({ used: 'undefined' });

          expect(resp.status).toEqual(400);
          expect(resp.body).toEqual({
            error: 'Bad Request',
            message: ['used must be a boolean value'],
            statusCode: 400,
          });
        });
      });

      describe('validate module_id', () => {
        it("should return 404 if module doesn't exist", async () => {
          const resp = await request(app.getHttpServer()).get('/v1/modules/777/operators/keys');
          expect(resp.status).toEqual(404);
          expect(resp.body).toEqual({
            error: 'Not Found',
            message: 'Module with moduleId 777 is not supported',
            statusCode: 404,
          });
        });

        it('should return 400 error if module_id is not a contract address or number', async () => {
          const resp = await request(app.getHttpServer()).get(`/v1/modules/sjdnsjkfsjkbfsjdfbdjfb/operators/keys`);
          expect(resp.status).toEqual(400);
          expect(resp.body).toEqual({
            error: 'Bad Request',
            message: ['module_id must be a contract address or numeric value'],
            statusCode: 400,
          });
        });

        it('should return 400 error if module_id is not set', async () => {
          const resp = await request(app.getHttpServer()).get('/v1/modules//operators/keys');
          expect(resp.status).toEqual(400);
          expect(resp.body).toEqual({
            error: 'Bad Request',
            message: ['module_id must be a contract address or numeric value'],
            statusCode: 400,
          });
        });

        it('should return 400 error if module_id is negative value', async () => {
          const resp = await request(app.getHttpServer()).get('/v1/modules/-1/operators/keys');
          expect(resp.status).toEqual(400);
          expect(resp.body).toEqual({
            error: 'Bad Request',
            message: ['module_id must be a contract address or numeric value'],
            statusCode: 400,
          });
        });

        it('Should return 400 error if module_id zero address', async () => {
          const resp = await request(app.getHttpServer()).get(`/v1/modules/${AddressZero}/operators/keys`);
          expect(resp.status).toEqual(400);
          expect(resp.body).toEqual({
            error: 'Bad Request',
            message: ['module_id cannot be the zero address'],
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

      it('should return too early response if there are no meta', async () => {
        await moduleStorageService.upsert(dvtModule, 1, '');
        const resp = await request(app.getHttpServer()).get(`/v1/modules/${dvtModule.moduleId}/operators/keys`);
        expect(resp.status).toEqual(425);
        expect(resp.body).toEqual({ message: 'Too early response', statusCode: 425 });
      });
    });
  });

  describe('The /v2/modules/operators/keys request', () => {
    describe('api ready to work', () => {
      beforeAll(async () => {
        // lets save meta
        await elMetaStorageService.update(elMeta);
        // lets save keys
        await keysStorageService.save(keys);
        // lets save operators
        await operatorsStorageService.save(operators);
        // lets save modules
        await moduleStorageService.upsert(dvtModule, 1, '');
        await moduleStorageService.upsert(curatedModule, 1, '');
      });

      afterAll(async () => {
        await cleanDB();
      });

      describe('The /keys request', () => {
        it('should return all modules, operators and keys', async () => {
          const resp = await request(app.getHttpServer()).get(`/v2/modules/operators/keys`);

          expect(resp.status).toEqual(200);

          const expectedResponse: ModulesOperatorsKeysRecord[] = [
            {
              stakingModule: dvtModuleResp,
              meta: {
                elBlockSnapshot: {
                  blockNumber: elMeta.number,
                  blockHash: elMeta.hash,
                  timestamp: elMeta.timestamp,
                  lastChangedBlockHash: elMeta.lastChangedBlockHash,
                },
              },
              operator: null,
              key: null,
            },
            ...dvtModuleKeysResponse.map((key) => ({ stakingModule: null, meta: null, operator: null, key })),
            ...dvtOperatorsResp.map((operator, i) => ({
              stakingModule: null,
              meta: null,
              operator,
              key: null,
            })),
            // curated module
            {
              stakingModule: curatedModuleResp,
              meta: null,
              operator: null,
              key: null,
            },
            ...curatedOperatorsResp.map((operator) => ({
              stakingModule: null,
              meta: null,
              operator,
              key: null,
            })),
            ...curatedModuleKeysResponse.map((key) => ({ stakingModule: null, meta: null, operator: null, key })),
          ];

          expect(resp.body).toEqual(expect.arrayContaining(expectedResponse));
        });
      });
    });
  });
});
