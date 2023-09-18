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
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { SRModulesOperatorsKeysController } from './sr-modules-operators-keys.controller';
import { StakingRouterModule } from '../../staking-router-modules/staking-router.module';

import { SRModuleStorageService } from '../../storage/sr-module.storage';
import { ElMetaStorageService } from '../../storage/el-meta.storage';
import { SRModulesOperatorsKeysService } from './sr-modules-operators-keys.service';
import { nullTransport, LoggerModule } from '@lido-nestjs/logger';

import * as request from 'supertest';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';

import { dvtModule, curatedModule, dvtModuleResp } from '../module.fixture';
import { elMeta } from '../el-meta.fixture';
import { keys, dvtModuleKeys } from '../key.fixtures';
import { operators, operatorOneDvt, operatorTwoDvt } from '../operator.fixtures';
// import { validationOpt } from '../../main';

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
      //  sqlite3 only supports serializable transactions, ignoring the isolation level param
      // TODO: use postgres
      MikroOrmModule.forRoot({
        dbName: ':memory:',
        type: 'sqlite',
        allowGlobalContext: true,
        entities: ['./**/*.entity.ts'],
      }),
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

      it('should return all keys for request without filters', async () => {
        const resp = await request(app.getHttpServer()).get(`/v1/modules/${dvtModule.id}/operators/keys`);

        expect(resp.status).toEqual(200);
        expect(resp.body.data.operators).toEqual(expect.arrayContaining([operatorOneDvt, operatorTwoDvt]));
        expect(resp.body.data.keys).toEqual(expect.arrayContaining(dvtModuleKeys));
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
          .get(`/v1/modules/${dvtModule.id}/operators/keys`)
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
          .get(`/v1/modules/${dvtModule.id}/operators/keys`)
          .query({ used: 0, operatorIndex: 2 });
        expect(resp.status).toEqual(400);
        expect(resp.body).toEqual({ error: 'Bad Request', message: ['used must be a boolean value'], statusCode: 400 });
      });

      it('should return used keys and operator one', async () => {
        const resp = await request(app.getHttpServer())
          .get(`/v1/modules/${dvtModule.id}/operators/keys`)
          .query({ used: true, operatorIndex: 1 });

        const expectedKeys = dvtModuleKeys.filter((key) => key.used && key.operatorIndex == 1);

        expect(resp.status).toEqual(200);
        expect(resp.body.data.operators).toEqual(expect.arrayContaining([operatorOneDvt]));
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
          .get(`/v1/modules/${dvtModule.id}/operators/keys`)
          .query({ used: false, operatorIndex: 1 });

        const expectedKeys = dvtModuleKeys.filter((key) => !key.used && key.operatorIndex == 1);

        expect(resp.status).toEqual(200);
        expect(resp.body.data.operators).toEqual(expect.arrayContaining([operatorOneDvt]));
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
          .get(`/v1/modules/${dvtModule.id}/operators/keys`)
          .query({ operatorIndex: 777 });

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
        const resp = await request(app.getHttpServer()).get(`/v1/modules/${dvtModule.id}/operators/keys`);
        expect(resp.status).toEqual(425);
        expect(resp.body).toEqual({ message: 'Too early response', statusCode: 425 });
      });
    });
  });
});
