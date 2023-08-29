import {
  BatchProviderModule,
  ExtendedJsonRpcBatchProvider,
  SimpleFallbackJsonRpcBatchProvider,
} from '@lido-nestjs/execution';
import { LoggerModule, nullTransport } from '@lido-nestjs/logger';
import { MikroORM } from '@mikro-orm/core';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';

import { createSDK, nse } from 'nse-test';

import { RegistryKeyStorageService, RegistryStorageService } from '../common/registry';
import { KeysController, KeysService } from '../http/keys';

import { StakingRouterModule } from '../staking-router-modules/staking-router.module';
import { StakingRouterFetchService } from '../staking-router-modules/contracts';
import { ElMetaStorageService } from '../storage/el-meta.storage';
import { SRModuleStorageService } from '../storage/sr-module.storage';
import { KeysUpdateService } from '../jobs/keys-update';
import { ScheduleModule } from '@nestjs/schedule';
import { ExecutionProvider, ExecutionProviderService } from '../common/execution-provider';
import { ConfigService } from '../common/config';
import { PrometheusService } from '../common/prometheus';
import { JobService } from '../common/job';
import { StakingModuleInterfaceService } from '../staking-router-modules/contracts/staking-module-interface';
import { LidoLocatorService } from '../staking-router-modules/contracts/lido-locator';
import { LidoLocator__factory, LIDO_LOCATOR_CONTRACT_TOKEN } from '@lido-nestjs/contracts';

jest.setTimeout(100_000);
process.env['CL_API_URLS'] = '';
// process.env['PROVIDERS_URLS'] = '';

describe('Simple DVT', () => {
  let sdk: nse.SDK;
  let session: nse.HardhatSession;
  let initialState: nse.StoryResult<'simple-dvt-mock/initial-state'>;

  let prevBlockNumber = 0;

  let app: INestApplication;

  let keysStorageService: RegistryKeyStorageService;
  let moduleStorageService: SRModuleStorageService;
  let elMetaStorageService: ElMetaStorageService;
  let keysService: KeysService;
  let registryStorage: RegistryStorageService;
  let keysUpdateService: KeysUpdateService;
  beforeAll(async () => {
    sdk = await createSDK('http://localhost:8001');

    session = await sdk.env.hardhat({});

    process.env['PROVIDERS_URLS'] = `http://127.0.0.1:${session.env.port}`;
    console.log(`http://127.0.0.1:${session.env.port}`);
    initialState = await session.story('simple-dvt-mock/initial-state', {});

    const providerModule = BatchProviderModule.forRoot({ url: `http://127.0.0.1:${session.env.port}` });
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
      ScheduleModule.forRoot(),
      // KeysUpdateModule,

      providerModule,
      StakingRouterModule.forFeatureAsync({
        inject: [ExtendedJsonRpcBatchProvider],
        async useFactory(provider) {
          return { provider };
        },
      }),
    ];

    const controllers = [KeysController];
    const providers = [
      // { provide: StakingRouterFetchService, useFactory: StakingRouterFetchService },
      { provide: ExecutionProviderService, useValue: session.provider },
      { provide: SimpleFallbackJsonRpcBatchProvider, useValue: session.provider },
      { provide: ExecutionProvider, useValue: session.provider },
      {
        provide: LIDO_LOCATOR_CONTRACT_TOKEN,
        useValue: LidoLocator__factory.connect(initialState.locatorAddress, session.provider),
      },
      {
        provide: ConfigService,
        useValue: {
          get(path) {
            console.log(path);
            return initialState.locatorAddress;
          },
        },
      },
      {
        provide: JobService,
        useValue: { wrapJob: async (_, cb) => await cb() },
      },
      {
        provide: PrometheusService,
        useValue: {
          httpRequestDuration: jest.fn(),
          buildInfo: jest.fn(),
          elRpcRequestDuration: jest.fn(),
          clApiRequestDuration: jest.fn(),
          jobDuration: jest.fn(),
          registryLastUpdate: jest.fn(),
          validatorsRegistryLastTimestampUpdate: jest.fn(),
          registryNumberOfKeysBySRModuleAndOperator: jest.fn(),
          registryNonce: jest.fn(),
          registryBlockNumber: jest.fn(),
          validatorsRegistryLastBlockNumber: jest.fn(),
          validatorsRegistryLastSlot: jest.fn(),
          validatorsEnabled: jest.fn(),
        },
      },
      KeysService,
      KeysUpdateService,
      StakingRouterFetchService,
      StakingModuleInterfaceService,
      LidoLocatorService,
    ];

    const moduleRef = await Test.createTestingModule({ imports, controllers, providers })
      // .overrideProvider(ExecutionProviderModule)
      // .useValue(providerModule)
      .compile();

    elMetaStorageService = moduleRef.get(ElMetaStorageService);
    keysStorageService = moduleRef.get(RegistryKeyStorageService);
    moduleStorageService = moduleRef.get(SRModuleStorageService);
    keysService = moduleRef.get(KeysService);
    registryStorage = moduleRef.get(RegistryStorageService);
    keysUpdateService = moduleRef.get(KeysUpdateService);

    // disable cron scheduling
    jest.spyOn(keysUpdateService, 'initialize').mockImplementation(() => Promise.resolve());

    const generator = moduleRef.get(MikroORM).getSchemaGenerator();
    await generator.updateSchema();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.enableVersioning({ type: VersioningType.URI });
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    await app.init();
  });

  afterAll(() => {
    app.close();
  });

  test('initial state created', async () => {
    expect((await session.provider.getBlock('latest')).number).toBeGreaterThan(0);
    expect(initialState).toBeDefined();
    expect(initialState.locatorAddress).toBeDefined();
  });

  test('update keys api keys', async () => {
    await keysUpdateService.update();
    const {
      meta: { elBlockSnapshot },
      keysGenerators,
    } = await keysService.get({});
    const currentBlockNumber = (await session.provider.getBlock('latest')).number;

    expect(elBlockSnapshot.blockNumber).toBe(currentBlockNumber);
    prevBlockNumber = currentBlockNumber;

    const keys: any = [];
    for (const keysGenerator of keysGenerators) {
      for await (const keysBatch of keysGenerator) {
        keys.push(keysBatch);
      }
    }
    const { simpleDVTModuleState, curatedModuleState } = initialState;

    const simpleDVTKeysCount = simpleDVTModuleState.keysCount * simpleDVTModuleState.nodeOperatorsCount;
    const curatedModuleKeysCount = curatedModuleState.keysCount * curatedModuleState.nodeOperatorsCount;
    // const keys = await Promise.all([...keysGenerators.flat()]);
    expect(keys).toHaveLength(simpleDVTKeysCount + curatedModuleKeysCount);
  });

  test('meta is updating correctly', async () => {
    // mine new block
    await session.provider.evm_mine();
    const currentBlockNumber = (await session.provider.getBlock('latest')).number;
    // check if the block has been changed
    expect(prevBlockNumber).toBeLessThan(currentBlockNumber);

    await keysUpdateService.update();

    const {
      meta: { elBlockSnapshot },
    } = await keysService.get({});

    expect(elBlockSnapshot.blockNumber).toBe(currentBlockNumber);

    prevBlockNumber = currentBlockNumber;
  });
});
