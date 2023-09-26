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
import { StakingRouterModule } from '../../staking-router-modules/staking-router.module';

import { SRModuleStorageService } from '../../storage/sr-module.storage';
import { ElMetaStorageService } from '../../storage/el-meta.storage';
import { nullTransport, LoggerModule } from '@lido-nestjs/logger';

import * as request from 'supertest';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';

import { dvtModule, curatedModule, srModules, dvtModuleResp, curatedModuleResp } from '../module.fixture';
import { elMeta } from '../el-meta.fixture';
import { SRModulesOperatorsController } from './sr-modules-operators.controller';
import { SRModulesOperatorsService } from './sr-modules-operators.service';
import {
  operators,
  operatorOneCurated,
  operatorTwoCurated,
  operatorOneDvt,
  operatorTwoDvt,
} from '../operator.fixtures';

describe('SRModuleOperatorsController (e2e)', () => {
  let app: INestApplication;

  let moduleStorageService: SRModuleStorageService;
  let elMetaStorageService: ElMetaStorageService;
  let registryStorage: RegistryStorageService;
  let operatorsStorageService: RegistryOperatorStorageService;

  const operatorByModules = [
    {
      operators: [operatorOneDvt, operatorTwoDvt],
      module: dvtModuleResp,
    },
    {
      operators: [operatorOneCurated, operatorTwoCurated],
      module: curatedModuleResp,
    },
  ];

  async function cleanDB() {
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

  class RegistryKeyStorageServiceMock extends RegistryKeyStorageService {
    async *findStream(where, fields): AsyncIterable<any> {
      const result = await this.find(where);
      for (const key of result) {
        yield key;
      }
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

    const controllers = [SRModulesOperatorsController];
    const providers = [SRModulesOperatorsService];
    const moduleRef = await Test.createTestingModule({ imports, controllers, providers })
      .overrideProvider(KeyRegistryService)
      .useClass(KeysRegistryServiceMock)
      .overrideProvider(RegistryKeyStorageService)
      .useClass(RegistryKeyStorageServiceMock)
      .compile();

    elMetaStorageService = moduleRef.get(ElMetaStorageService);
    operatorsStorageService = moduleRef.get(RegistryOperatorStorageService);
    moduleStorageService = moduleRef.get(SRModuleStorageService);
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

  describe('The /operators request', () => {
    describe('api ready to work', () => {
      beforeAll(async () => {
        // lets save meta
        await elMetaStorageService.update(elMeta);
        // lets save operators
        await operatorsStorageService.save(operators);

        // lets save modules
        await moduleStorageService.upsert(dvtModule, 1);
        await moduleStorageService.upsert(curatedModule, 1);
      });

      afterAll(async () => {
        await cleanDB();
      });

      it('should return all operators for request without filters', async () => {
        // Get all operators without filters
        const resp = await request(app.getHttpServer()).get('/v1/operators');

        expect(resp.status).toEqual(200);
        expect(resp.body.data.length).toEqual(srModules.length);
        expect(resp.body.data).toEqual(expect.arrayContaining(operatorByModules));

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
        // lets save operators
        await operatorsStorageService.save(operators);

        const resp = await request(app.getHttpServer()).get('/v1/operators');
        expect(resp.status).toEqual(425);
        expect(resp.body).toEqual({ message: 'Too early response', statusCode: 425 });
      });

      it('should return too early response if there are no meta', async () => {
        // lets save operators
        await operatorsStorageService.save(operators);
        await moduleStorageService.upsert(curatedModule, 1);

        const resp = await request(app.getHttpServer()).get('/v1/operators');
        expect(resp.status).toEqual(425);
        expect(resp.body).toEqual({ message: 'Too early response', statusCode: 425 });
      });
    });
  });

  describe('The /modules/:module_id/operators request', () => {
    describe('api ready to work', () => {
      beforeAll(async () => {
        // lets save meta
        await elMetaStorageService.update(elMeta);
        // lets save operators
        await operatorsStorageService.save(operators);

        // lets save modules
        await moduleStorageService.upsert(dvtModule, 1);
        await moduleStorageService.upsert(curatedModule, 1);
      });

      afterAll(async () => {
        await cleanDB();
      });

      it('should return all operators that satisfy the request', async () => {
        // Get all operators without filters
        const resp = await request(app.getHttpServer()).get(`/v1/modules/${dvtModule.moduleId}/operators`);

        const respByContractAddress = await request(app.getHttpServer()).get(
          `/v1/modules/${dvtModule.stakingModuleAddress}/operators`,
        );

        expect(resp.body).toEqual(respByContractAddress.body);

        expect(resp.status).toEqual(200);
        expect(resp.body.data.operators).toBeDefined();
        expect(resp.body.data.operators).toEqual(expect.arrayContaining([operatorOneDvt, operatorTwoDvt]));

        expect(resp.body.meta).toEqual({
          elBlockSnapshot: {
            blockNumber: elMeta.number,
            blockHash: elMeta.hash,
            timestamp: elMeta.timestamp,
          },
        });

        const resp2 = await request(app.getHttpServer()).get(`/v1/modules/${curatedModule.moduleId}/operators`);

        expect(resp2.status).toEqual(200);
        expect(resp2.body.data.operators).toEqual(expect.arrayContaining([operatorOneCurated, operatorTwoCurated]));

        expect(resp2.body.meta).toEqual({
          elBlockSnapshot: {
            blockNumber: elMeta.number,
            blockHash: elMeta.hash,
            timestamp: elMeta.timestamp,
          },
        });
      });

      it('should return 404 if module was not found', async () => {
        // Get all operators without filters
        const resp = await request(app.getHttpServer()).get('/v1/modules/777/operators');

        expect(resp.status).toEqual(404);
        expect(resp.body).toEqual({
          error: 'Not Found',
          message: 'Module with moduleId 777 is not supported',
          statusCode: 404,
        });
      });

      it('should return 400 error if module_id is not a contract address or number', async () => {
        const resp = await request(app.getHttpServer()).get(`/v1/modules/sjdnsjkfsjkbfsjdfbdjfb/operators`);
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
        // lets save operators
        await operatorsStorageService.save(operators);
        await moduleStorageService.upsert(curatedModule, 1);

        const resp = await request(app.getHttpServer()).get(`/v1/modules/${curatedModule.moduleId}/operators`);
        expect(resp.status).toEqual(425);
        expect(resp.body).toEqual({ message: 'Too early response', statusCode: 425 });
      });
    });
  });

  describe('The /modules/:module_id/operators/:operator_id', () => {
    describe('api ready to work', () => {
      beforeAll(async () => {
        // lets save meta
        await elMetaStorageService.update(elMeta);
        // lets save operators
        await operatorsStorageService.save(operators);

        // lets save modules
        await moduleStorageService.upsert(dvtModule, 1);
        await moduleStorageService.upsert(curatedModule, 1);
      });

      afterAll(async () => {
        await cleanDB();
      });

      it('should return operator and module', async () => {
        const resp = await request(app.getHttpServer()).get(
          `/v1/modules/${dvtModule.moduleId}/operators/${operatorOneDvt.index}`,
        );

        expect(resp.status).toEqual(200);
        expect(resp.body.data).toEqual({ operator: operatorOneDvt, module: dvtModuleResp });
        expect(resp.body.meta).toEqual({
          elBlockSnapshot: {
            blockNumber: elMeta.number,
            blockHash: elMeta.hash,
            timestamp: elMeta.timestamp,
          },
        });
      });

      it('should return 404 if operator was not found', async () => {
        const resp = await request(app.getHttpServer()).get(`/v1/modules/${dvtModule.moduleId}/operators/777`);
        expect(resp.status).toEqual(404);
        expect(resp.body).toEqual({
          error: 'Not Found',
          message: 'Operator with index 777 is not found for module with moduleId 2',
          statusCode: 404,
        });
      });

      it('should return 404 if module was not found', async () => {
        const resp = await request(app.getHttpServer()).get(`/v1/modules/777/operators/${operatorOneDvt.index}`);
        expect(resp.status).toEqual(404);
        expect(resp.body).toEqual({
          error: 'Not Found',
          message: 'Module with moduleId 777 is not supported',
          statusCode: 404,
        });
      });

      it('should return 400 error if operator_id is not a number', async () => {
        const resp = await request(app.getHttpServer()).get(`/v1/modules/${dvtModule.moduleId}/operators/somenumber`);
        expect(resp.status).toEqual(400);
        expect(resp.body).toEqual({
          error: 'Bad Request',
          message: ['operator_id must not be less than 0', 'operator_id must be an integer number'],
          statusCode: 400,
        });
      });

      it('should return 400 error if module_id is not a contract address or number', async () => {
        const resp = await request(app.getHttpServer()).get(
          `/v1/modules/sjdnsjkfsjkbfsjdfbdjfb/operators/${operatorOneCurated.index}`,
        );
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
        // lets save operators
        await operatorsStorageService.save(operators);
        await moduleStorageService.upsert(curatedModule, 1);

        const resp = await request(app.getHttpServer()).get(
          `/v1/modules/${curatedModule.moduleId}/operators/${operatorOneCurated.index}`,
        );
        expect(resp.status).toEqual(425);
        expect(resp.body).toEqual({ message: 'Too early response', statusCode: 425 });
      });
    });
  });
});
