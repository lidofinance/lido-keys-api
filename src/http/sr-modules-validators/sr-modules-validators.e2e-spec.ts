/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test } from '@nestjs/testing';
import { Global, INestApplication, Module, ValidationPipe, VersioningType } from '@nestjs/common';
import {
  KeyRegistryService,
  RegistryKey,
  RegistryKeyStorageService,
  RegistryOperator,
  RegistryStorageModule,
  RegistryStorageService,
} from '../../common/registry';
import { MikroORM } from '@mikro-orm/core';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { SRModulesValidatorsController } from './sr-modules-validators.controller';
import { StakingRouterModule } from '../../staking-router-modules/staking-router.module';

import { SRModuleStorageService } from '../../storage/sr-module.storage';
import { ElMetaStorageService } from '../../storage/el-meta.storage';
import { SRModulesValidatorsService } from './sr-modules-validators.service';
import { nullTransport, LoggerModule } from '@lido-nestjs/logger';

import * as request from 'supertest';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';

import { elMeta } from '../el-meta.fixture';
import { keys, dvtModule, curatedModule } from '../db.fixtures';
import { ConfigService } from '../../common/config';
import {
  ConsensusMetaEntity,
  ConsensusValidatorEntity,
  ValidatorsRegistryInterface,
} from '@lido-nestjs/validators-registry';
import { ConsensusModule, ConsensusService } from '@lido-nestjs/consensus';
import { FetchModule } from '@lido-nestjs/fetch';
import { ConfigModule } from '../../common/config';
import { ValidatorsModule } from '../../validators';
import { SrModuleEntity } from '../../storage/sr-module.entity';
import { ElMetaEntity } from '../../storage/el-meta.entity';
import {
  block,
  header,
  slot,
  validators,
  consensusMetaResp,
  dvtOpOneResp100percent,
  dvtOpOneResp10percent,
  dvtOpOneResp20percent,
  dvtOpOneResp5maxAmount,
  dvtOpOneRespExitMessages100percent,
  dvtOpOneRespExitMessages10percent,
  dvtOpOneRespExitMessages20percent,
  dvtOpOneRespExitMessages5maxAmount,
} from '../consensus.fixtures';

describe('SRModulesValidatorsController (e2e)', () => {
  let app: INestApplication;

  let keysStorageService: RegistryKeyStorageService;
  let moduleStorageService: SRModuleStorageService;
  let elMetaStorageService: ElMetaStorageService;
  let registryStorage: RegistryStorageService;
  let validatorsRegistry: ValidatorsRegistryInterface;

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

  const consensusServiceMock = {
    getBlockV2: (args: { blockId: string | number }) => {
      return block;
    },
    getBlockHeader: (args: { blockId: string | number }) => {
      return header;
    },
    getStateValidators: (args: { stateId: string }) => {
      return validators;
    },
  };

  beforeAll(async () => {
    const imports = [
      //  sqlite3 only supports serializable transactions, ignoring the isolation level param
      // TODO: use postgres
      MikroOrmModule.forRoot({
        dbName: ':memory:',
        type: 'sqlite',
        allowGlobalContext: true,
        entities: [
          RegistryKey,
          RegistryOperator,
          ConsensusValidatorEntity,
          ConsensusMetaEntity,
          SrModuleEntity,
          ElMetaEntity,
        ],
      }),
      LoggerModule.forRoot({ transports: [nullTransport()] }),
      KeyRegistryModule,
      StakingRouterModule,
      ConfigModule,
      ConsensusModule.forRoot({
        imports: [FetchModule],
      }),
      ValidatorsModule,
    ];

    const controllers = [SRModulesValidatorsController];
    const providers = [SRModulesValidatorsService];
    const moduleRef = await Test.createTestingModule({ imports, controllers, providers })
      .overrideProvider(KeyRegistryService)
      .useClass(KeysRegistryServiceMock)
      .overrideProvider(ConfigService)
      .useValue({
        get(path) {
          const conf = { VALIDATOR_REGISTRY_ENABLE: true };
          return conf[path];
        },
      })
      .overrideProvider(ConsensusService)
      .useValue(consensusServiceMock)
      .compile();

    elMetaStorageService = moduleRef.get(ElMetaStorageService);
    keysStorageService = moduleRef.get(RegistryKeyStorageService);
    moduleStorageService = moduleRef.get(SRModuleStorageService);
    registryStorage = moduleRef.get(RegistryStorageService);
    // validatorsStorage = moduleRef.get(StorageService);
    validatorsRegistry = moduleRef.get<ValidatorsRegistryInterface>(ValidatorsRegistryInterface);

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

  describe('The /v1/modules/{:module_id}/validators/validator-exits-to-prepare/{:operator_id} request', () => {
    describe('api ready to work', () => {
      beforeAll(async () => {
        // lets save keys
        await keysStorageService.save(keys);
        // lets save modules
        await moduleStorageService.upsert(dvtModule, 1);
        await moduleStorageService.upsert(curatedModule, 1);
        await validatorsRegistry.update(slot);
      });

      afterAll(async () => {
        await cleanDB();
      });

      it("Should return 10% validators by default for 'dvt' module when 'operator' is set to 'one'", async () => {
        await elMetaStorageService.update({ ...elMeta, number: consensusMetaResp.blockNumber });
        const resp = await request(app.getHttpServer()).get(
          `/v1/modules/${dvtModule.moduleId}/validators/validator-exits-to-prepare/1`,
        );

        expect(resp.status).toEqual(200);
        expect(resp.body.data.length).toEqual(1);
        expect(resp.body.data).toEqual(expect.arrayContaining(dvtOpOneResp10percent));
        expect(resp.body.meta).toEqual({
          clBlockSnapshot: consensusMetaResp,
        });
      });

      it("Should return 100% validators for 'dvt' module when 'operator' is set to 'one'", async () => {
        await elMetaStorageService.update({ ...elMeta, number: consensusMetaResp.blockNumber });
        const resp = await request(app.getHttpServer())
          .get(`/v1/modules/${dvtModule.moduleId}/validators/validator-exits-to-prepare/1`)
          .query({ percent: 100 });

        expect(resp.status).toEqual(200);
        expect(resp.body.data.length).toEqual(10);
        expect(resp.body.data).toEqual(expect.arrayContaining(dvtOpOneResp100percent));
        expect(resp.body.meta).toEqual({
          clBlockSnapshot: consensusMetaResp,
        });
      });

      it("Should prioritize 'percent' over 'max_amount' when both are provided in the query", async () => {
        await elMetaStorageService.update({ ...elMeta, number: consensusMetaResp.blockNumber });
        const resp = await request(app.getHttpServer())
          .get(`/v1/modules/${dvtModule.moduleId}/validators/validator-exits-to-prepare/1`)
          .query({ percent: 20, max_amount: 5 });

        expect(resp.status).toEqual(200);
        expect(resp.body.data.length).toEqual(2);
        expect(resp.body.data).toEqual(expect.arrayContaining(dvtOpOneResp20percent));
        expect(resp.body.meta).toEqual({
          clBlockSnapshot: consensusMetaResp,
        });
      });

      it('Should return 5 validators when max_amount is 5', async () => {
        await elMetaStorageService.update({ ...elMeta, number: consensusMetaResp.blockNumber });
        const resp = await request(app.getHttpServer())
          .get(`/v1/modules/${dvtModule.moduleId}/validators/validator-exits-to-prepare/1`)
          .query({ max_amount: 5 });

        expect(resp.status).toEqual(200);
        expect(resp.body.data.length).toEqual(5);
        expect(resp.body.data).toEqual(expect.arrayContaining(dvtOpOneResp5maxAmount));
        expect(resp.body.meta).toEqual({
          clBlockSnapshot: consensusMetaResp,
        });
      });

      it('Should return 100% validators when max_amount exceeds the total validator amount', async () => {
        await elMetaStorageService.update({ ...elMeta, number: consensusMetaResp.blockNumber });
        const resp = await request(app.getHttpServer())
          .get(`/v1/modules/${dvtModule.moduleId}/validators/validator-exits-to-prepare/1`)
          .query({ max_amount: 100 });

        expect(resp.status).toEqual(200);
        expect(resp.body.data.length).toEqual(10);
        expect(resp.body.data).toEqual(expect.arrayContaining(dvtOpOneResp100percent));
        expect(resp.body.meta).toEqual({
          clBlockSnapshot: consensusMetaResp,
        });
      });

      it('Should return 100% validators when percent exceeds the total validator amount', async () => {
        await elMetaStorageService.update({ ...elMeta, number: consensusMetaResp.blockNumber });
        const resp = await request(app.getHttpServer())
          .get(`/v1/modules/${dvtModule.moduleId}/validators/validator-exits-to-prepare/1`)
          .query({ percent: 200 });

        // sometime get 400
        expect(resp.status).toEqual(200);
        expect(resp.body.data.length).toEqual(10);
        expect(resp.body.data).toEqual(expect.arrayContaining(dvtOpOneResp100percent));
        expect(resp.body.meta).toEqual({
          clBlockSnapshot: consensusMetaResp,
        });
      });

      it('Should return empty list of validators when percent equal to 0', async () => {
        await elMetaStorageService.update({ ...elMeta, number: consensusMetaResp.blockNumber });
        const resp = await request(app.getHttpServer())
          .get(`/v1/modules/${dvtModule.moduleId}/validators/validator-exits-to-prepare/1`)
          .query({ percent: 0 });

        expect(resp.status).toEqual(200);
        expect(resp.body.data.length).toEqual(0);
        expect(resp.body.data).toEqual([]);
        expect(resp.body.meta).toEqual({
          clBlockSnapshot: consensusMetaResp,
        });
      });

      it('Should return empty list of validators when max_amount equal to 0', async () => {
        await elMetaStorageService.update({ ...elMeta, number: consensusMetaResp.blockNumber });
        const resp = await request(app.getHttpServer())
          .get(`/v1/modules/${dvtModule.moduleId}/validators/validator-exits-to-prepare/1`)
          .query({ percent: 0 });

        expect(resp.status).toEqual(200);
        expect(resp.body.data.length).toEqual(0);
        expect(resp.body.data).toEqual([]);
        expect(resp.body.meta).toEqual({
          clBlockSnapshot: consensusMetaResp,
        });
      });

      it('Should return 400 error if percent or max_amount are negative', async () => {
        await elMetaStorageService.update({ ...elMeta, number: consensusMetaResp.blockNumber });
        const resp = await request(app.getHttpServer())
          .get(`/v1/modules/${dvtModule.moduleId}/validators/validator-exits-to-prepare/1`)
          .query({ percent: -1, max_amount: -1 });

        expect(resp.status).toEqual(400);
        expect(resp.body.message).toEqual(
          expect.arrayContaining(['max_amount must not be less than 0', 'percent must not be less than 0']),
        );
      });

      it('Should return 400 error if percent or max_amount is not number', async () => {
        await elMetaStorageService.update({ ...elMeta, number: consensusMetaResp.blockNumber });
        const resp = await request(app.getHttpServer())
          .get(`/v1/modules/${dvtModule.moduleId}/validators/validator-exits-to-prepare/1`)
          .query({ max_amount: 'dfsdfds', percent: 'sdsdfsf' });

        expect(resp.status).toEqual(400);
        expect(resp.body.message).toEqual(
          expect.arrayContaining([
            'max_amount must not be less than 0',
            'max_amount must be an integer number',
            'percent must not be less than 0',
            'percent must be an integer number',
          ]),
        );
      });

      it("Should return a 500 error if 'el_meta' is older than 'cl_meta'", async () => {
        await elMetaStorageService.update({ ...elMeta, number: consensusMetaResp.blockNumber - 1 });
        const resp = await request(app.getHttpServer()).get(
          `/v1/modules/${dvtModule.moduleId}/validators/validator-exits-to-prepare/1`,
        );

        expect(resp.status).toEqual(500);
        expect(resp.body).toEqual({
          error: 'Internal Server Error',
          message:
            'The Execution Layer node is behind the Consensus Layer node, check that the EL node is synced and running.',
          statusCode: 500,
        });
      });

      it('Should return a 404 error if the requested module does not exist', async () => {
        await elMetaStorageService.update({ ...elMeta, number: consensusMetaResp.blockNumber });
        const resp = await request(app.getHttpServer()).get(`/v1/modules/777/validators/validator-exits-to-prepare/1`);

        expect(resp.status).toEqual(404);
        expect(resp.body).toEqual({
          error: 'Not Found',
          message: 'Module with moduleId 777 is not supported',
          statusCode: 404,
        });
      });

      it("Should return empty list if operator doesn't exist", async () => {
        await elMetaStorageService.update({ ...elMeta, number: consensusMetaResp.blockNumber });
        const resp = await request(app.getHttpServer()).get(
          `/v1/modules/${dvtModule.moduleId}/validators/validator-exits-to-prepare/777`,
        );

        expect(resp.status).toEqual(200);
        expect(resp.body.data).toEqual([]);
        expect(resp.body.meta).toEqual({
          clBlockSnapshot: consensusMetaResp,
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
        await moduleStorageService.upsert(dvtModule, 1);
        const resp = await request(app.getHttpServer()).get(
          `/v1/modules/${dvtModule.moduleId}/validators/validator-exits-to-prepare/1`,
        );
        expect(resp.status).toEqual(425);
        expect(resp.body).toEqual({ message: 'Too early response', statusCode: 425 });
      });
    });
  });

  describe('The /v1/modules/{:module_id}/validators/generate-unsigned-exit-messages/{:operator_id} request', () => {
    describe('api ready to work', () => {
      beforeAll(async () => {
        // lets save keys
        await keysStorageService.save(keys);
        // lets save modules
        await moduleStorageService.upsert(dvtModule, 1);
        await moduleStorageService.upsert(curatedModule, 1);
        await validatorsRegistry.update(slot);
      });

      afterAll(async () => {
        await cleanDB();
      });

      it("Should return 10% validators by default for 'dvt' module when 'operator' is set to 'one'", async () => {
        await elMetaStorageService.update({ ...elMeta, number: consensusMetaResp.blockNumber });
        const resp = await request(app.getHttpServer()).get(
          `/v1/modules/${dvtModule.moduleId}/validators/generate-unsigned-exit-messages/1`,
        );

        expect(resp.status).toEqual(200);
        expect(resp.body.data.length).toEqual(1);
        expect(resp.body.data).toEqual(expect.arrayContaining(dvtOpOneRespExitMessages10percent));
        expect(resp.body.meta).toEqual({
          clBlockSnapshot: consensusMetaResp,
        });
      });

      it("Should return 100% validators for 'dvt' module when 'operator' is set to 'one'", async () => {
        await elMetaStorageService.update({ ...elMeta, number: consensusMetaResp.blockNumber });
        const resp = await request(app.getHttpServer())
          .get(`/v1/modules/${dvtModule.moduleId}/validators/generate-unsigned-exit-messages/1`)
          .query({ percent: 100 });

        expect(resp.status).toEqual(200);
        expect(resp.body.data.length).toEqual(10);
        expect(resp.body.data).toEqual(expect.arrayContaining(dvtOpOneRespExitMessages100percent));
        expect(resp.body.meta).toEqual({
          clBlockSnapshot: consensusMetaResp,
        });
      });

      it("Should prioritize 'percent' over 'max_amount' when both are provided in the query", async () => {
        await elMetaStorageService.update({ ...elMeta, number: consensusMetaResp.blockNumber });
        const resp = await request(app.getHttpServer())
          .get(`/v1/modules/${dvtModule.moduleId}/validators/generate-unsigned-exit-messages/1`)
          .query({ percent: 20, max_amount: 5 });

        expect(resp.status).toEqual(200);
        expect(resp.body.data.length).toEqual(2);
        expect(resp.body.data).toEqual(expect.arrayContaining(dvtOpOneRespExitMessages20percent));
        expect(resp.body.meta).toEqual({
          clBlockSnapshot: consensusMetaResp,
        });
      });

      it('Should return 5 validators when max_amount is 5', async () => {
        await elMetaStorageService.update({ ...elMeta, number: consensusMetaResp.blockNumber });
        const resp = await request(app.getHttpServer())
          .get(`/v1/modules/${dvtModule.moduleId}/validators/generate-unsigned-exit-messages/1`)
          .query({ max_amount: 5 });

        expect(resp.status).toEqual(200);
        expect(resp.body.data.length).toEqual(5);
        expect(resp.body.data).toEqual(expect.arrayContaining(dvtOpOneRespExitMessages5maxAmount));
        expect(resp.body.meta).toEqual({
          clBlockSnapshot: consensusMetaResp,
        });
      });

      it('Should return 100% validators when max_amount exceeds the total validator amount', async () => {
        await elMetaStorageService.update({ ...elMeta, number: consensusMetaResp.blockNumber });
        const resp = await request(app.getHttpServer())
          .get(`/v1/modules/${dvtModule.moduleId}/validators/generate-unsigned-exit-messages/1`)
          .query({ max_amount: 100 });

        expect(resp.status).toEqual(200);
        expect(resp.body.data.length).toEqual(10);
        expect(resp.body.data).toEqual(expect.arrayContaining(dvtOpOneRespExitMessages100percent));
        expect(resp.body.meta).toEqual({
          clBlockSnapshot: consensusMetaResp,
        });
      });

      it('Should return 100% validators when percent exceeds the total validator amount', async () => {
        await elMetaStorageService.update({ ...elMeta, number: consensusMetaResp.blockNumber });
        const resp = await request(app.getHttpServer())
          .get(`/v1/modules/${dvtModule.moduleId}/validators/generate-unsigned-exit-messages/1`)
          .query({ percent: 200 });

        expect(resp.status).toEqual(200);
        expect(resp.body.data.length).toEqual(10);
        expect(resp.body.data).toEqual(expect.arrayContaining(dvtOpOneRespExitMessages100percent));
        expect(resp.body.meta).toEqual({
          clBlockSnapshot: consensusMetaResp,
        });
      });

      it('Should return empty list of validators when percent equal to 0', async () => {
        await elMetaStorageService.update({ ...elMeta, number: consensusMetaResp.blockNumber });
        const resp = await request(app.getHttpServer())
          .get(`/v1/modules/${dvtModule.moduleId}/validators/generate-unsigned-exit-messages/1`)
          .query({ percent: 0 });

        expect(resp.status).toEqual(200);
        expect(resp.body.data.length).toEqual(0);
        expect(resp.body.data).toEqual([]);
        expect(resp.body.meta).toEqual({
          clBlockSnapshot: consensusMetaResp,
        });
      });

      it('Should return empty list of validators when max_amount equal to 0', async () => {
        await elMetaStorageService.update({ ...elMeta, number: consensusMetaResp.blockNumber });
        const resp = await request(app.getHttpServer())
          .get(`/v1/modules/${dvtModule.moduleId}/validators/generate-unsigned-exit-messages/1`)
          .query({ percent: 0 });

        expect(resp.status).toEqual(200);
        expect(resp.body.data.length).toEqual(0);
        expect(resp.body.data).toEqual([]);
        expect(resp.body.meta).toEqual({
          clBlockSnapshot: consensusMetaResp,
        });
      });

      it('Should return 400 error if percent or max_amount are negative', async () => {
        await elMetaStorageService.update({ ...elMeta, number: consensusMetaResp.blockNumber });
        const resp = await request(app.getHttpServer())
          .get(`/v1/modules/${dvtModule.moduleId}/validators/generate-unsigned-exit-messages/1`)
          .query({ percent: -1, max_amount: -1 });

        expect(resp.status).toEqual(400);
        expect(resp.body.message).toEqual(
          expect.arrayContaining(['max_amount must not be less than 0', 'percent must not be less than 0']),
        );
      });

      it('Should return 400 error if percent or max_amount is not number', async () => {
        await elMetaStorageService.update({ ...elMeta, number: consensusMetaResp.blockNumber });
        const resp = await request(app.getHttpServer())
          .get(`/v1/modules/${dvtModule.moduleId}/validators/generate-unsigned-exit-messages/1`)
          .query({ max_amount: 'dfsdfds', percent: 'sdsdfsf' });

        expect(resp.status).toEqual(400);
        expect(resp.body.message).toEqual(
          expect.arrayContaining([
            'max_amount must not be less than 0',
            'max_amount must be an integer number',
            'percent must not be less than 0',
            'percent must be an integer number',
          ]),
        );
      });

      it("Should return a 500 error if 'el_meta' is older than 'cl_meta'", async () => {
        await elMetaStorageService.update({ ...elMeta, number: consensusMetaResp.blockNumber - 1 });
        const resp = await request(app.getHttpServer()).get(
          `/v1/modules/${dvtModule.moduleId}/validators/generate-unsigned-exit-messages/1`,
        );

        expect(resp.status).toEqual(500);
        expect(resp.body).toEqual({
          error: 'Internal Server Error',
          message:
            'The Execution Layer node is behind the Consensus Layer node, check that the EL node is synced and running.',
          statusCode: 500,
        });
      });

      it('Should return a 404 error if the requested module does not exist', async () => {
        await elMetaStorageService.update({ ...elMeta, number: consensusMetaResp.blockNumber });
        const resp = await request(app.getHttpServer()).get(
          `/v1/modules/777/validators/generate-unsigned-exit-messages/1`,
        );

        expect(resp.status).toEqual(404);
        expect(resp.body).toEqual({
          error: 'Not Found',
          message: 'Module with moduleId 777 is not supported',
          statusCode: 404,
        });
      });

      it("Should return empty list if operator doesn't exist", async () => {
        await elMetaStorageService.update({ ...elMeta, number: consensusMetaResp.blockNumber });
        const resp = await request(app.getHttpServer()).get(
          `/v1/modules/${dvtModule.moduleId}/validators/generate-unsigned-exit-messages/777`,
        );

        expect(resp.status).toEqual(200);
        expect(resp.body.data).toEqual([]);
        expect(resp.body.meta).toEqual({
          clBlockSnapshot: consensusMetaResp,
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
        await moduleStorageService.upsert(dvtModule, 1);
        const resp = await request(app.getHttpServer()).get(
          `/v1/modules/${dvtModule.moduleId}/validators/generate-unsigned-exit-messages/1`,
        );
        expect(resp.status).toEqual(425);
        expect(resp.body).toEqual({ message: 'Too early response', statusCode: 425 });
      });
    });
  });
});
