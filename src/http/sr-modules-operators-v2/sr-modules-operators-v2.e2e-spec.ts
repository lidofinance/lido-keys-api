/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test } from '@nestjs/testing';
import { Global, INestApplication, Module, ValidationPipe, VersioningType } from '@nestjs/common';
import {
  KeyRegistryService,
  RegistryOperator,
  RegistryOperatorStorageService,
  RegistryStorageModule,
  RegistryStorageService,
} from '../../common/registry';
import { MikroORM } from '@mikro-orm/core';
import { StakingRouterModule } from '../../staking-router-modules/staking-router.module';
import { STAKING_MODULE_TYPE } from '../../staking-router-modules/constants';
import { StakingModule } from '../../staking-router-modules/interfaces/staking-module.interface';

import { SRModuleStorageService } from '../../storage/sr-module.storage';
import { ElMetaStorageService } from '../../storage/el-meta.storage';
import { nullTransport, LoggerModule } from '@lido-nestjs/logger';

import * as request from 'supertest';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { SRModulesOperatorsV2Controller } from './sr-modules-operators-v2.controller';
import { SRModulesOperatorsV2Service } from './sr-modules-operators-v2.service';
import { elMeta } from '../el-meta.fixture';
import { curatedModule, operatorOneCurated, operatorTwoCurated } from '../db.fixtures';
import { DatabaseE2ETestingModule } from 'app';
import { CSMKeyRegistryService } from 'common/registry-csm';

// CSM: served by the community impl with legacy (0x01) withdrawal credentials.
const csmModule: StakingModule = {
  moduleId: 3,
  stakingModuleAddress: '0x0165878a594ca255338adfa4d48449f69242eb90',
  moduleFee: 100,
  treasuryFee: 100,
  targetShare: 100,
  status: 0,
  name: 'community-onchain-v1',
  type: 'community-onchain-v1' as STAKING_MODULE_TYPE,
  lastDepositAt: 1691500734,
  lastDepositBlock: 11,
  exitedValidatorsCount: 0,
  active: true,
  withdrawalCredentialsType: 1,
};

// A curated-onchain-v2 module with compounding (0x02) withdrawal credentials, also served by the community impl.
const cmv2Module: StakingModule = {
  moduleId: 4,
  stakingModuleAddress: '0xa513e6e4b8f2a923d98304ec87f64353c4d5c853',
  moduleFee: 100,
  treasuryFee: 100,
  targetShare: 100,
  status: 0,
  name: 'curated-onchain-v2',
  type: 'curated-onchain-v2' as STAKING_MODULE_TYPE,
  lastDepositAt: 1691500734,
  lastDepositBlock: 11,
  exitedValidatorsCount: 0,
  active: true,
  withdrawalCredentialsType: 2,
};

// Two operators of the CSM module. One has a genuine 0 withdrawn keys to prove that a real 0
// is preserved (never conflated with the "not applicable" NULL of curated (NOR) modules).
const csmOperatorOne: RegistryOperator = {
  index: 1,
  active: true,
  name: 'csm-op-1',
  rewardAddress: '0x0000000000000000000000000000000000000000',
  stoppedValidators: 4,
  stakingLimit: 10,
  usedSigningKeys: 8,
  totalSigningKeys: 12,
  moduleAddress: csmModule.stakingModuleAddress,
  finalizedUsedSigningKeys: 8,
  depositableValidatorsCount: 2,
  totalWithdrawnKeys: 5,
};

const csmOperatorTwo: RegistryOperator = {
  index: 2,
  active: true,
  name: 'csm-op-2',
  rewardAddress: '0x0000000000000000000000000000000000000000',
  stoppedValidators: 0,
  stakingLimit: 6,
  usedSigningKeys: 3,
  totalSigningKeys: 6,
  moduleAddress: csmModule.stakingModuleAddress,
  finalizedUsedSigningKeys: 3,
  depositableValidatorsCount: 1,
  totalWithdrawnKeys: 0,
};

const cmv2Operator: RegistryOperator = {
  index: 0,
  active: true,
  name: 'cmv2-op-0',
  rewardAddress: '0x0000000000000000000000000000000000000000',
  stoppedValidators: 0,
  stakingLimit: 3,
  usedSigningKeys: 2,
  totalSigningKeys: 3,
  moduleAddress: cmv2Module.stakingModuleAddress,
  finalizedUsedSigningKeys: 2,
  depositableValidatorsCount: 1,
  totalWithdrawnKeys: 1,
};

describe('SRModulesOperatorsV2Controller (e2e)', () => {
  let app: INestApplication;

  let moduleStorageService: SRModuleStorageService;
  let elMetaStorageService: ElMetaStorageService;
  let registryStorage: RegistryStorageService;
  let operatorsStorageService: RegistryOperatorStorageService;

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

    const controllers = [SRModulesOperatorsV2Controller];
    const providers = [SRModulesOperatorsV2Service];
    const moduleRef = await Test.createTestingModule({ imports, controllers, providers })
      .overrideProvider(KeyRegistryService)
      .useClass(KeysRegistryServiceMock)
      .overrideProvider(CSMKeyRegistryService)
      .useClass(CSMKeysRegistryServiceMock)
      .compile();

    elMetaStorageService = moduleRef.get(ElMetaStorageService);
    operatorsStorageService = moduleRef.get(RegistryOperatorStorageService);
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

  describe('The /v2/modules/:module_id/operators request', () => {
    describe('api ready to work', () => {
      beforeAll(async () => {
        await elMetaStorageService.update(elMeta);
        // CSM, CMv2 and a curated (NOR) module exist in the DB, so a 404 on the curated one
        // proves the endpoint filters by module type, not merely by module existence.
        await operatorsStorageService.save([
          csmOperatorOne,
          csmOperatorTwo,
          cmv2Operator,
          operatorOneCurated,
          operatorTwoCurated,
        ]);
        await moduleStorageService.upsert(csmModule, 1, '');
        await moduleStorageService.upsert(cmv2Module, 1, '');
        await moduleStorageService.upsert(curatedModule, 1, '');
      });

      afterAll(async () => {
        await cleanDB();
      });

      it('should return operators of the CSM (0x01) module, with totalWithdrawnKeys', async () => {
        const resp = await request(app.getHttpServer()).get(`/v2/modules/${csmModule.moduleId}/operators`);

        expect(resp.status).toEqual(200);

        // the response carries exactly the requested module
        expect(resp.body.data.module.id).toEqual(csmModule.moduleId);
        expect(resp.body.data.module.withdrawalCredentialsType).toEqual(1);

        // only that module's operators are returned
        const operators = resp.body.data.operators;
        expect(operators).toHaveLength(2);

        const withdrawnByIndex = Object.fromEntries(operators.map((op) => [op.index, op.totalWithdrawnKeys]));
        expect(withdrawnByIndex).toEqual({ 1: 5, 2: 0 }); // note: a real 0 is preserved

        // stoppedValidators is intentionally excluded from this endpoint's shape
        for (const op of operators) {
          expect(op).toHaveProperty('totalWithdrawnKeys');
          expect(op).not.toHaveProperty('stoppedValidators');
        }

        expect(resp.body.meta).toEqual({
          elBlockSnapshot: {
            blockNumber: elMeta.number,
            blockHash: elMeta.hash,
            timestamp: elMeta.timestamp,
            lastChangedBlockHash: elMeta.lastChangedBlockHash,
          },
        });
      });

      it('should return operators of the curated-onchain-v2 (0x02) module, with totalWithdrawnKeys', async () => {
        const resp = await request(app.getHttpServer()).get(`/v2/modules/${cmv2Module.moduleId}/operators`);

        expect(resp.status).toEqual(200);
        expect(resp.body.data.module.id).toEqual(cmv2Module.moduleId);
        expect(resp.body.data.module.withdrawalCredentialsType).toEqual(2);
        expect(resp.body.data.operators).toHaveLength(1);
        expect(resp.body.data.operators[0].totalWithdrawnKeys).toEqual(1);
      });

      it('should resolve the module by contract address too', async () => {
        const resp = await request(app.getHttpServer()).get(`/v2/modules/${csmModule.stakingModuleAddress}/operators`);

        expect(resp.status).toEqual(200);
        expect(resp.body.data.module.id).toEqual(csmModule.moduleId);
        expect(resp.body.data.operators).toHaveLength(2);
      });

      it('should return 404 for an existing curated (NOR) module', async () => {
        const resp = await request(app.getHttpServer()).get(`/v2/modules/${curatedModule.moduleId}/operators`);

        expect(resp.status).toEqual(404);
        expect(resp.body).toEqual({
          error: 'Not Found',
          message: `Module with moduleId ${curatedModule.moduleId} is not supported by v2 operators endpoint`,
          statusCode: 404,
        });
      });

      it('should return 404 for a module that does not exist', async () => {
        const resp = await request(app.getHttpServer()).get('/v2/modules/777/operators');

        expect(resp.status).toEqual(404);
        expect(resp.body).toEqual({
          error: 'Not Found',
          message: 'Module with moduleId 777 is not supported',
          statusCode: 404,
        });
      });

      it('should return 400 if module_id is not a contract address or number', async () => {
        const resp = await request(app.getHttpServer()).get('/v2/modules/not-a-module/operators');
        expect(resp.status).toEqual(400);
      });
    });

    describe('too early response case', () => {
      beforeEach(async () => {
        await cleanDB();
      });

      afterEach(async () => {
        await cleanDB();
      });

      it('should return too early response if there is no meta', async () => {
        await operatorsStorageService.save([csmOperatorOne, csmOperatorTwo]);
        await moduleStorageService.upsert(csmModule, 1, '');

        const resp = await request(app.getHttpServer()).get(`/v2/modules/${csmModule.moduleId}/operators`);
        expect(resp.status).toEqual(425);
        expect(resp.body).toEqual({ message: 'Too early response', statusCode: 425 });
      });
    });
  });
});
