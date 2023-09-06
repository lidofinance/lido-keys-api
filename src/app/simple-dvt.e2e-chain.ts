import { SimpleFallbackJsonRpcBatchProvider } from '@lido-nestjs/execution';
import { MikroORM } from '@mikro-orm/core';
import { Test, TestingModule } from '@nestjs/testing';

import { createSDK, chronix } from 'chronix';

import { RegistryKeyStorageService } from '../common/registry';
import { ElMetaStorageService } from '../storage/el-meta.storage';
import { SRModuleStorageService } from '../storage/sr-module.storage';
import { KeysUpdateService } from '../jobs/keys-update';
import { ExecutionProvider, ExecutionProviderService } from '../common/execution-provider';
import { ConfigService } from '../common/config';
import { PrometheusService } from '../common/prometheus';
import { StakingRouterService } from '../staking-router-modules/staking-router.service';
import { AppModule } from './app-testing.module';

jest.setTimeout(100_000);

describe('Simple DVT', () => {
  let sdk: chronix.SDK;
  let session: chronix.HardhatSession;
  let initialState: chronix.StoryResult<'simple-dvt-mock/initial-state'>;

  let moduleRef: TestingModule;

  let keysStorageService: RegistryKeyStorageService;
  let moduleStorageService: SRModuleStorageService;
  let elMetaStorageService: ElMetaStorageService;

  let stakingRouterService: StakingRouterService;
  let keysUpdateService: KeysUpdateService;

  let prevBlockNumber = 0;

  beforeAll(async () => {
    sdk = await createSDK('http://localhost:8001');

    session = await sdk.env.hardhat({});
    initialState = await session.story('simple-dvt-mock/initial-state', {});

    moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ExecutionProviderService)
      .useValue(session.provider)
      .overrideProvider(SimpleFallbackJsonRpcBatchProvider)
      .useValue(session.provider)
      .overrideProvider(ExecutionProvider)
      .useValue(session.provider)
      .overrideProvider(PrometheusService)
      .useValue({
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
      })
      .overrideProvider(ConfigService)
      .useValue({
        get(path) {
          const conf = { LIDO_LOCATOR_ADDRESS: initialState.locatorAddress };
          return conf[path];
        },
      })
      .compile();

    const generator = moduleRef.get(MikroORM).getSchemaGenerator();
    await generator.updateSchema();

    elMetaStorageService = moduleRef.get(ElMetaStorageService);
    keysStorageService = moduleRef.get(RegistryKeyStorageService);
    moduleStorageService = moduleRef.get(SRModuleStorageService);

    keysUpdateService = moduleRef.get(KeysUpdateService);
    stakingRouterService = moduleRef.get(StakingRouterService);
  });

  afterAll(async () => {
    await keysStorageService.removeAll();
    await moduleStorageService.removeAll();
    await elMetaStorageService.removeAll();

    await moduleRef.close();
  });

  test('initial state created', async () => {
    expect((await session.provider.getBlock('latest')).number).toBeGreaterThan(0);
    expect(initialState).toBeDefined();
    expect(initialState.locatorAddress).toBeDefined();
  });

  test('update keys api keys', async () => {
    await keysUpdateService.update();

    const currentBlockNumber = (await session.provider.getBlock('latest')).number;
    const elSnapshot = await stakingRouterService.getElBlockSnapshot();

    expect(elSnapshot).toBeDefined();
    expect(elSnapshot?.blockNumber).toBe(currentBlockNumber);
    prevBlockNumber = currentBlockNumber;

    const srModules = await stakingRouterService.getStakingModules();

    expect(srModules).toHaveLength(2);

    const initialModules = [initialState.curatedModuleState, initialState.simpleDVTModuleState];
    for (const [index, srModule] of srModules.entries()) {
      const moduleInstance = stakingRouterService.getStakingRouterModuleImpl(srModule.type);
      const keys = await moduleInstance.getKeys(srModule.stakingModuleAddress, {});
      const operators = await moduleInstance.getOperators(srModule.stakingModuleAddress);

      const onchainModuleState = initialModules[index];

      expect(operators).toHaveLength(onchainModuleState.nodeOperatorsCount);
      expect(keys).toHaveLength(onchainModuleState.keysCount * onchainModuleState.nodeOperatorsCount);
    }
  });

  test('meta is updating correctly', async () => {
    // mine new block
    await session.provider.evm_mine();
    const currentBlockNumber = (await session.provider.getBlock('latest')).number;
    // check if the block has been changed
    expect(prevBlockNumber).toBeLessThan(currentBlockNumber);

    await keysUpdateService.update();

    const elSnapshot = await stakingRouterService.getElBlockSnapshot();

    expect(elSnapshot).toBeDefined();
    expect(elSnapshot?.blockNumber).toBe(currentBlockNumber);
    prevBlockNumber = currentBlockNumber;
  });
});
