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
import { STAKING_MODULE_TYPE, WITHDRAWAL_CREDENTIALS_TYPE } from '../../staking-router-modules/constants';
import { StakingModule } from '../../staking-router-modules/interfaces/staking-module.interface';

import { SRModuleStorageService } from '../../storage/sr-module.storage';
import { ElMetaStorageService } from '../../storage/el-meta.storage';
import { nullTransport, LoggerModule } from '@lido-nestjs/logger';

import * as request from 'supertest';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { SRModulesCompoundingOperatorsController } from './sr-modules-compounding-operators.controller';
import { SRModulesCompoundingOperatorsService } from './sr-modules-compounding-operators.service';
import { elMeta } from '../el-meta.fixture';
import { curatedModule, operatorOneCurated, operatorTwoCurated } from '../db.fixtures';
import { DatabaseE2ETestingModule } from 'app';
import { CSMKeyRegistryService } from 'common/registry-csm';

// A compounding (0x02) module: served by the community impl AND using compounding withdrawal credentials.
const compoundingModule: StakingModule = {
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
  withdrawalCredentialsType: WITHDRAWAL_CREDENTIALS_TYPE.COMPOUNDING,
};

// Two operators of the compounding module. One has a genuine 0 withdrawn keys to prove that a real 0
// is preserved (never conflated with the "not applicable" NULL of legacy modules).
const compoundingOperatorOne: RegistryOperator = {
  index: 1,
  active: true,
  name: 'compounding-op-1',
  rewardAddress: '0x0000000000000000000000000000000000000000',
  stoppedValidators: 4,
  stakingLimit: 10,
  usedSigningKeys: 8,
  totalSigningKeys: 12,
  moduleAddress: compoundingModule.stakingModuleAddress,
  finalizedUsedSigningKeys: 8,
  depositableValidatorsCount: 2,
  totalWithdrawnKeys: 5,
};

const compoundingOperatorTwo: RegistryOperator = {
  index: 2,
  active: true,
  name: 'compounding-op-2',
  rewardAddress: '0x0000000000000000000000000000000000000000',
  stoppedValidators: 0,
  stakingLimit: 6,
  usedSigningKeys: 3,
  totalSigningKeys: 6,
  moduleAddress: compoundingModule.stakingModuleAddress,
  finalizedUsedSigningKeys: 3,
  depositableValidatorsCount: 1,
  totalWithdrawnKeys: 0,
};

describe('SRModulesCompoundingOperatorsController (e2e)', () => {
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

    const controllers = [SRModulesCompoundingOperatorsController];
    const providers = [SRModulesCompoundingOperatorsService];
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

  describe('The /v2/modules/:module_id/compounding-operators request', () => {
    describe('api ready to work', () => {
      beforeAll(async () => {
        await elMetaStorageService.update(elMeta);
        // Both a compounding (0x02) and a legacy (0x01) module exist in the DB, so a 404 on the legacy
        // one proves the endpoint filters by module type, not merely by module existence.
        await operatorsStorageService.save([
          compoundingOperatorOne,
          compoundingOperatorTwo,
          operatorOneCurated,
          operatorTwoCurated,
        ]);
        await moduleStorageService.upsert(compoundingModule, 1, '');
        await moduleStorageService.upsert(curatedModule, 1, '');
      });

      afterAll(async () => {
        await cleanDB();
      });

      it('should return operators only for the compounding (0x02) module, with totalWithdrawnKeys', async () => {
        const resp = await request(app.getHttpServer()).get(
          `/v2/modules/${compoundingModule.moduleId}/compounding-operators`,
        );

        expect(resp.status).toEqual(200);

        // the response carries exactly the requested compounding module
        expect(resp.body.data.module.id).toEqual(compoundingModule.moduleId);
        expect(resp.body.data.module.withdrawalCredentialsType).toEqual(WITHDRAWAL_CREDENTIALS_TYPE.COMPOUNDING);

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

      it('should resolve the compounding module by contract address too', async () => {
        const resp = await request(app.getHttpServer()).get(
          `/v2/modules/${compoundingModule.stakingModuleAddress}/compounding-operators`,
        );

        expect(resp.status).toEqual(200);
        expect(resp.body.data.module.id).toEqual(compoundingModule.moduleId);
        expect(resp.body.data.operators).toHaveLength(2);
      });

      it('should return 404 for an existing legacy (0x01) module (not a compounding module)', async () => {
        const resp = await request(app.getHttpServer()).get(
          `/v2/modules/${curatedModule.moduleId}/compounding-operators`,
        );

        expect(resp.status).toEqual(404);
        expect(resp.body).toEqual({
          error: 'Not Found',
          message: `Module with moduleId ${curatedModule.moduleId} does not support compounding operators`,
          statusCode: 404,
        });
      });

      it('should return 404 for a module that does not exist', async () => {
        const resp = await request(app.getHttpServer()).get('/v2/modules/777/compounding-operators');

        expect(resp.status).toEqual(404);
        expect(resp.body).toEqual({
          error: 'Not Found',
          message: 'Module with moduleId 777 is not supported',
          statusCode: 404,
        });
      });

      it('should return 400 if module_id is not a contract address or number', async () => {
        const resp = await request(app.getHttpServer()).get('/v2/modules/not-a-module/compounding-operators');
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
        await operatorsStorageService.save([compoundingOperatorOne, compoundingOperatorTwo]);
        await moduleStorageService.upsert(compoundingModule, 1, '');

        const resp = await request(app.getHttpServer()).get(
          `/v2/modules/${compoundingModule.moduleId}/compounding-operators`,
        );
        expect(resp.status).toEqual(425);
        expect(resp.body).toEqual({ message: 'Too early response', statusCode: 425 });
      });
    });
  });
});
