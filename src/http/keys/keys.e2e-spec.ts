import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { RegistryKeyStorageService } from '../../common/registry';
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

describe('KeyController (e2e)', () => {
  let app: INestApplication;

  let keysStorageService: RegistryKeyStorageService;
  let moduleStorageService: SRModuleStorageService;
  let elMetaStorageService: ElMetaStorageService;

  beforeEach(async () => {
    const imports = [
      // MikroOrmModule.forRoot({
      //   dbName: process.env.DB_NAME,
      //   type: 'postgresql',
      //   host: process.env.DB_HOST,
      //   port: parseInt(process?.env?.DB_PORT ?? '', 10),
      //   user: process.env.DB_USER,
      //   password: process.env.DB_PASSWORD,
      //   allowGlobalContext: true,
      //   autoLoadEntities: true,
      //   entities: ['./**/*.entity.ts'],
      // }),
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

    const generator = moduleRef.get(MikroORM).getSchemaGenerator();
    await generator.updateSchema();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.enableVersioning({ type: VersioningType.URI });
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterEach(async () => {
    await keysStorageService.removeAll();
    await moduleStorageService.removeAll();
    await elMetaStorageService.removeAll();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('The /keys requests', () => {
    it('should return an array of keys', async () => {
      // lets save meta
      const elMeta = {
        number: 74,
        hash: '0x662e3e713207240b25d01324b6eccdc91493249a5048881544254994694530a5',
        timestamp: 1691500803,
      };
      await elMetaStorageService.update(elMeta);

      // lets save keys
      const keys = [
        { operatorIndex: 1, index: 1, moduleAddress: dvtModule.stakingModuleAddress, ...key },
        { operatorIndex: 1, index: 2, moduleAddress: curatedModule.stakingModuleAddress, ...key },
      ];

      await keysStorageService.save(keys);

      // lets save modules
      await moduleStorageService.store(dvtModule, 1);
      await moduleStorageService.store(curatedModule, 1);

      const response = await request(app.getHttpServer()).get('/v1/keys');

      expect(response.status).toEqual(200);
      expect(response.body.data.length).toEqual(keys.length);
      // TODO: how does it work
      expect(response.body.data).toEqual(expect.arrayContaining(keys));
      expect(response.body.meta).toEqual({
        elBlockSnapshot: {
          blockNumber: elMeta.number,
          blockHash: elMeta.hash,
          timestamp: elMeta.timestamp,
        },
      });
    });

    it('should return too early response if there are no modules in database', async () => {
      // lets save meta
      const elMeta = {
        number: 74,
        hash: '0x662e3e713207240b25d01324b6eccdc91493249a5048881544254994694530a5',
        timestamp: 1691500803,
      };
      await elMetaStorageService.update(elMeta);

      // lets save keys
      const keys = [
        { operatorIndex: 1, index: 1, moduleAddress: dvtModule.stakingModuleAddress, ...key },
        { operatorIndex: 1, index: 2, moduleAddress: curatedModule.stakingModuleAddress, ...key },
      ];

      await keysStorageService.save(keys);

      const response = await request(app.getHttpServer()).get('/v1/keys');
      expect(response.status).toEqual(425);
      expect(response.body).toEqual({ message: 'Too early response', statusCode: 425 });
    });

    it('should return too early response if there are no meta', async () => {
      // lets save keys
      const keys = [
        { operatorIndex: 1, index: 1, moduleAddress: dvtModule.stakingModuleAddress, ...key },
        { operatorIndex: 1, index: 2, moduleAddress: curatedModule.stakingModuleAddress, ...key },
      ];

      await keysStorageService.save(keys);

      await moduleStorageService.store(curatedModule, 1);

      const response = await request(app.getHttpServer()).get('/v1/keys');
      expect(response.status).toEqual(425);
      expect(response.body).toEqual({ message: 'Too early response', statusCode: 425 });
    });
  });
});
