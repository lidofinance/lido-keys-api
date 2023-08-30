import { Test } from '@nestjs/testing';
import { Global, INestApplication, Module, ValidationPipe, VersioningType } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/core';
import { MikroOrmModule } from '@mikro-orm/nestjs';

import { KeyRegistryService, RegistryStorageModule, RegistryStorageService } from '../../common/registry';
import { StakingRouterModule } from '../../staking-router-modules/staking-router.module';
import { dvtModule, curatedModule, dvtModuleResp, curatedModuleResp } from '../../storage/module.fixture';
import { SRModuleStorageService } from '../../storage/sr-module.storage';
import { ElMetaStorageService } from '../../storage/el-meta.storage';

import { nullTransport, LoggerModule } from '@lido-nestjs/logger';

import * as request from 'supertest';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { SRModulesController } from './sr-modules.controller';
import { SRModulesService } from './sr-modules.service';

// import { validationOpt } from '../../main';

describe('SRModulesController (e2e)', () => {
  let app: INestApplication;

  let moduleStorageService: SRModuleStorageService;
  let elMetaStorageService: ElMetaStorageService;
  let registryStorage: RegistryStorageService;

  const elMeta = {
    number: 74,
    hash: '0x662e3e713207240b25d01324b6eccdc91493249a5048881544254994694530a5',
    timestamp: 1691500803,
  };

  async function cleanDB() {
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

    const controllers = [SRModulesController];
    const providers = [SRModulesService];

    const moduleRef = await Test.createTestingModule({ imports, controllers, providers })
      .overrideProvider(KeyRegistryService)
      .useClass(KeysRegistryServiceMock)
      .compile();

    elMetaStorageService = moduleRef.get(ElMetaStorageService);
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

  describe('The /modules requests', () => {
    describe('api ready to work', () => {
      beforeAll(async () => {
        // lets save meta
        await elMetaStorageService.update(elMeta);

        // lets save modules
        await moduleStorageService.store(dvtModule, 1);
        await moduleStorageService.store(curatedModule, 1);
      });

      afterAll(async () => {
        await cleanDB();
      });

      it('should return all modules list', async () => {
        const resp = await request(app.getHttpServer()).get('/v1/modules');

        expect(resp.status).toEqual(200);
        expect(resp.body.data.length).toEqual(2);

        expect(resp.body.data).toEqual(expect.arrayContaining([dvtModuleResp, curatedModuleResp]));
        expect(resp.body.elBlockSnapshot).toEqual({
          blockNumber: elMeta.number,
          blockHash: elMeta.hash,
          timestamp: elMeta.timestamp,
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
        const resp = await request(app.getHttpServer()).get('/v1/modules');
        expect(resp.status).toEqual(425);
        expect(resp.body).toEqual({ message: 'Too early response', statusCode: 425 });
      });

      it('should return too early response if there are no meta', async () => {
        await moduleStorageService.store(curatedModule, 1);
        const resp = await request(app.getHttpServer()).get('/v1/modules');
        expect(resp.status).toEqual(425);
        expect(resp.body).toEqual({ message: 'Too early response', statusCode: 425 });
      });
    });
  });

  describe('The /modules/{module_id} requests', () => {
    describe('api ready to work', () => {
      beforeAll(async () => {
        // lets save meta
        await elMetaStorageService.update(elMeta);
        // lets save modules
        await moduleStorageService.store(dvtModule, 1);
        await moduleStorageService.store(curatedModule, 1);
      });
      afterAll(async () => {
        await cleanDB();
      });
      it('should return module by id', async () => {
        const resp = await request(app.getHttpServer()).get(`/v1/modules/${dvtModule.id}`);
        expect(resp.status).toEqual(200);
        expect(resp.body.data).toEqual(dvtModuleResp);
        expect(resp.body.elBlockSnapshot).toEqual({
          blockNumber: elMeta.number,
          blockHash: elMeta.hash,
          timestamp: elMeta.timestamp,
        });
      });

      it("should return 404 if module doesn't exist", async () => {
        const resp = await request(app.getHttpServer()).get(`/v1/modules/77`);
        expect(resp.status).toEqual(404);
        expect(resp.body).toEqual({
          error: 'Not Found',
          message: 'Module with moduleId 77 is not supported',
          statusCode: 404,
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
        await moduleStorageService.store(curatedModule, 1);
        const resp = await request(app.getHttpServer()).get(`/v1/modules/${curatedModule.id}`);
        expect(resp.status).toEqual(425);
        expect(resp.body).toEqual({ message: 'Too early response', statusCode: 425 });
      });
    });
  });
});
