import { Test } from '@nestjs/testing';
import { Global, INestApplication, Module, ValidationPipe, VersioningType } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/core';
import { MikroOrmModule } from '@mikro-orm/nestjs';

import {
  RegistryKeyStorageService,
  KeyRegistryService,
  RegistryStorageModule,
  RegistryStorageService,
} from '../../common/registry';

import { StakingRouterModule } from '../../staking-router-modules/staking-router.module';
import { dvtModule, curatedModule } from '../../storage/module.fixture';
import { SRModuleStorageService } from '../../storage/sr-module.storage';
import { ElMetaStorageService } from '../../storage/el-meta.storage';

import { BatchProviderModule, ExtendedJsonRpcBatchProvider } from '@lido-nestjs/execution';
import { nullTransport, LoggerModule } from '@lido-nestjs/logger';

import * as request from 'supertest';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { SRModulesKeysController } from './sr-modules-keys.controller';
import { SRModulesKeysService } from './sr-modules-keys.service';

// import { validationOpt } from '../../main';

describe('SRModulesKeysController (e2e)', () => {
  let app: INestApplication;

  let moduleStorageService: SRModuleStorageService;
  let elMetaStorageService: ElMetaStorageService;
  let registryStorage: RegistryStorageService;
  let keysStorageService: RegistryKeyStorageService;

  const elMeta = {
    number: 74,
    hash: '0x662e3e713207240b25d01324b6eccdc91493249a5048881544254994694530a5',
    timestamp: 1691500803,
  };

  const dvtModuleKeys = [
    {
      operatorIndex: 1,
      index: 1,
      moduleAddress: dvtModule.stakingModuleAddress,
      key: '0xa544bc44d9eacbf4dd6a2d6087b43f4c67fd5618651b97effcb30997bf49e5d7acf0100ef14e5d087cc228bc78d498e6',
      depositSignature:
        '0x967875a0104d9f674538e2ec0df4be0a61ef08061cdcfa83e5a63a43dadb772d29053368224e5d8e046ba1a78490f5fc0f0186f23af0465d0a82b2db2e7535782fe12e1fd1cd4f6eb77d8dc7a4f7ab0fde31435d5fa98a013e0a716c5e1ef6a2',
      used: true,
    },
    {
      operatorIndex: 1,
      index: 2,
      moduleAddress: dvtModule.stakingModuleAddress,
      key: '0xb3e9f4e915f9fb9ef9c55da1815071f3f728cc6fc434fba2c11e08db5b5fa22b71d5975cec30ef97e7fc901e5a04ee5b',
      depositSignature:
        '0xb048f4a409d5a0aa638e5ec65c21e936ffde9a8d848e74e6b2f6972a4145620dc78c79db5425ea1a5c6b1dd8d50fc77f0bcec894c0a9446776936f2adf4f1dc7056fb3c4bdf9dbd00981288d4e582875d10b13d780dddc642496e97826abd3c7',
      used: false,
    },
  ];

  const keyForOperatorTwo = {
    operatorIndex: 2,
    index: 5,
    moduleAddress: curatedModule.stakingModuleAddress,
    key: '0x91024d603575605569c212b00f375c8bad733a697b453fbe054bb996bd24c7d1a5b6034cc58943aeddab05cbdfd40632',
    depositSignature:
      '0x9990450099816e066c20b5947be6bf089b57fcfacfb2c8285ddfd6c678a44198bf7c013a0d1a6353ed19dd94423eef7b010d25aaa2c3093760c79bf247f5350120e8a74e4586eeba0f1e2bcf17806f705007d7b5862039da5cd93ee659280d77',
    used: true,
  };

  const keyForOperatorTwoDuplicate = { ...keyForOperatorTwo, index: 6 };

  const curatedModuleKeys = [
    {
      operatorIndex: 1,
      index: 1,
      moduleAddress: curatedModule.stakingModuleAddress,
      key: '0xa554bc44d9eacbf4dd6a2d6087b43f4c67fd5618651b97effcb30997bf49e5d7acf0100ef14e5d087cc228bc78d498e6',
      depositSignature:
        '0x967875a0104d9f674538e2ec0df4be0a61ef08061cdcfa83e5a63a43dadb772d29053368224e5d8e046ba1a78490f5fc0f0186f23af0465d0a82b2db2e7535782fe12e1fd1cd4f6eb77d8dc7a4f7ab0fde31435d5fa98a013e0a716c5e1ef6a2',
      used: true,
    },
    {
      operatorIndex: 1,
      index: 2,
      moduleAddress: curatedModule.stakingModuleAddress,
      key: '0xb3a9f4e915f9fb9ef9c55da1815071f3f728cc6fc434fba2c11e08db5b5fa22b71d5975cec30ef97e7fc901e5a04ee5b',
      depositSignature:
        '0xb048f4a409d5a0aa638e5ec65c21e936ffde9a8d848e74e6b2f6972a4145620dc78c79db5425ea1a5c6b1dd8d50fc77f0bcec894c0a9446776936f2adf4f1dc7056fb3c4bdf9dbd00981288d4e582875d10b13d780dddc642496e97826abd3c7',
      used: true,
    },
    {
      operatorIndex: 1,
      index: 3,
      moduleAddress: curatedModule.stakingModuleAddress,
      key: '0x91524d603575605569c212b00f375c8bad733a697b453fbe054bb996bd24c7d1a5b6034cc58943aeddab05cbdfd40632',
      depositSignature:
        '0x9990450099816e066c20b5947be6bf089b57fcfacfb2c8285ddfd6c678a44198bf7c013a0d1a6353ed19dd94423eef7b010d25aaa2c3093760c79bf247f5350120e8a74e4586eeba0f1e2bcf17806f705007d7b5862039da5cd93ee659280d77',
      used: false,
    },
    {
      operatorIndex: 2,
      index: 4,
      moduleAddress: curatedModule.stakingModuleAddress,
      key: '0xa544bc44d8eacbf4dd6a2d6087b43f4c67fd5618651b97effcb30997bf49e5d7acf0100ef14e5d087cc228bc78d498e6',
      depositSignature:
        '0x967875a0104d1f674538e2ec0df4be0a61ef08061cdcfa83e5a63a43dadb772d29053368224e5d8e046ba1a78490f5fc0f0186f23af0465d0a82b2db2e7535782fe12e1fd1cd4f6eb77d8dc7a4f7ab0fde31435d5fa98a013e0a716c5e1ef6a2',
      used: true,
    },
    keyForOperatorTwo,
    keyForOperatorTwoDuplicate,
  ];

  const keys = [...dvtModuleKeys, ...curatedModuleKeys];

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

    const controllers = [SRModulesKeysController];
    const providers = [SRModulesKeysService];

    const moduleRef = await Test.createTestingModule({ imports, controllers, providers })
      .overrideProvider(KeyRegistryService)
      .useClass(KeysRegistryServiceMock)
      .compile();

    elMetaStorageService = moduleRef.get(ElMetaStorageService);
    moduleStorageService = moduleRef.get(SRModuleStorageService);
    keysStorageService = moduleRef.get(RegistryKeyStorageService);
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

  describe('The /modules/{module_id}/keys requests', () => {
    describe('api ready to work', () => {
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

      it('should return all keys of module', async () => {
        const resp = await request(app.getHttpServer()).get(`/v1/modules/${dvtModule.id}/keys`);

        expect(resp.status).toEqual(200);
        expect(resp.body.data.keys.length).toEqual(dvtModuleKeys.length);
        expect(resp.body.data.keys).toEqual(expect.arrayContaining(dvtModuleKeys));

        expect(resp.body.meta.elBlockSnapshot).toEqual({
          blockNumber: elMeta.number,
          blockHash: elMeta.hash,
          timestamp: elMeta.timestamp,
        });
      });
    });
    //   beforeEach(async () => {
    //     await cleanDB();
    //   });
    //   afterEach(async () => {
    //     await cleanDB();
    //   });

    //   it('should return too early response if there are no modules in database', async () => {
    //     await elMetaStorageService.update(elMeta);
    //     const resp = await request(app.getHttpServer()).get(`/v1/modules/${dvtModule.id}/keys`);
    //     expect(resp.status).toEqual(425);
    //     expect(resp.body).toEqual({ message: 'Too early response', statusCode: 425 });
    //   });

    //   it('should return too early response if there are no meta', async () => {
    //     await moduleStorageService.store(curatedModule, 1);
    //     const resp = await request(app.getHttpServer()).get(`/v1/modules/${dvtModule.id}/keys`);
    //     expect(resp.status).toEqual(425);
    //     expect(resp.body).toEqual({ message: 'Too early response', statusCode: 425 });
    //   });
    // });
  });
});
