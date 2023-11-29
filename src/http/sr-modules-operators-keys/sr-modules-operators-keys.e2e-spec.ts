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

describe('SRModulesOperatorsKeysController (e2e)', () => {
  let app: INestApplication;

  let keysStorageService: RegistryKeyStorageService;
  let operatorsStorageService: RegistryOperatorStorageService;
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
      DatabaseE2ETestingModule,
      LoggerModule.forRoot({ transports: [nullTransport()] }),
      KeyRegistryModule,
      StakingRouterModule,
    ];

    const controllers = [SRModulesOperatorsKeysController];
    const providers = [SRModulesOperatorsKeysService];
    const moduleRef = await Test.createTestingModule({ imports, controllers, providers })
      .overrideProvider(KeyRegistryService)
      .useClass(KeysRegistryServiceMock)
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

  describe('The /operators request', () => {
    describe('api ready to work', () => {
      beforeAll(async () => {
        // lets save meta
        await elMetaStorageService.update(elMeta);
        // lets save keys
        await keysStorageService.save(keys);
        // lets save operators
        await operatorsStorageService.save(operators);
        // lets save modules
        await moduleStorageService.upsert(dvtModule, 1);
        await moduleStorageService.upsert(curatedModule, 1);
      });

      afterAll(async () => {
        await cleanDB();
      });

      describe('The /keys request', () => {
        it('should return all modules, operators and keys', async () => {
          const resp = await request(app.getHttpServer()).get(`/v2/modules/operators/keys`);

          expect(resp.status).toEqual(200);

          const expectedResponse: ModulesOperatorsKeysRecord[] = [
            // dvt module
            {
              stakingModule: dvtModuleResp,
              meta: {
                elBlockSnapshot: {
                  blockNumber: elMeta.number,
                  blockHash: elMeta.hash,
                  timestamp: elMeta.timestamp,
                },
              },
              operator: dvtOperatorsResp[0],
              key: dvtModuleKeysResponse[0],
            },
            ...dvtOperatorsResp.slice(1).map((operator, i) => ({
              stakingModule: null,
              meta: null,
              operator,
              key: dvtModuleKeysResponse[i + 1],
            })),
            ...dvtModuleKeysResponse
              .slice(dvtOperatorsResp.length)
              .map((key) => ({ stakingModule: null, meta: null, operator: null, key })),

            // curated module
            {
              stakingModule: curatedModuleResp,
              meta: null,
              operator: curatedOperatorsResp[0],
              key: curatedModuleKeysResponse[0],
            },
            ...curatedOperatorsResp.slice(1).map((operator, i) => ({
              stakingModule: null,
              meta: null,
              operator,
              key: curatedModuleKeysResponse[i + 1],
            })),
            ...curatedModuleKeysResponse
              .slice(curatedOperatorsResp.length)
              .map((key) => ({ stakingModule: null, meta: null, operator: null, key })),
          ];

          expect(resp.body).toEqual(expectedResponse);
        });
      });

      it('should return all keys for request without filters', async () => {
        const resp = await request(app.getHttpServer()).get(`/v1/modules/${dvtModule.moduleId}/operators/keys`);

        const respByContractAddress = await request(app.getHttpServer()).get(
          `/v1/modules/${dvtModule.stakingModuleAddress}/operators/keys`,
        );

        expect(resp.body).toEqual(respByContractAddress.body);

        expect(resp.status).toEqual(200);
        expect(resp.body.data.operators).toEqual(expect.arrayContaining(dvtOperatorsResp));
        expect(resp.body.data.keys).toEqual(expect.arrayContaining(dvtModuleKeysResponse));
        expect(resp.body.data.module).toEqual(dvtModuleResp);
        expect(resp.body.meta).toEqual({
          elBlockSnapshot: {
            blockNumber: elMeta.number,
            blockHash: elMeta.hash,
            timestamp: elMeta.timestamp,
          },
        });
      });

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

      it('should return 400 error if used is not a boolean value', async () => {
        const resp = await request(app.getHttpServer())
          .get(`/v1/modules/${dvtModule.moduleId}/operators/keys`)
          .query({ used: 0, operatorIndex: 2 });
        expect(resp.status).toEqual(400);
        expect(resp.body).toEqual({ error: 'Bad Request', message: ['used must be a boolean value'], statusCode: 400 });
      });

      it('should return used keys and operator one', async () => {
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
          },
        });
      });

      it('should return unused keys and operator one', async () => {
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
          },
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
          },
        });
      });

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
    });

    describe('too early response case', () => {
      beforeEach(async () => {
        await cleanDB();
      });
      afterEach(async () => {
        await cleanDB();
      });

      it('should return too early response if there are no meta', async () => {
        await moduleStorageService.upsert(dvtModule, 1);
        const resp = await request(app.getHttpServer()).get(`/v1/modules/${dvtModule.moduleId}/operators/keys`);
        expect(resp.status).toEqual(425);
        expect(resp.body).toEqual({ message: 'Too early response', statusCode: 425 });
      });
    });
  });
});
