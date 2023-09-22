import { SimpleFallbackJsonRpcBatchProvider } from '@lido-nestjs/execution';
import { MikroORM } from '@mikro-orm/core';
import { Test, TestingModule } from '@nestjs/testing';

import { createSDK, chronix } from 'chronix';
import * as dotenv from 'dotenv';

import { RegistryKeyStorageService } from '../common/registry';
import { ElMetaStorageService } from '../storage/el-meta.storage';
import { SRModuleStorageService } from '../storage/sr-module.storage';
import { KeysUpdateService } from '../jobs/keys-update';
import { ExecutionProvider, ExecutionProviderService } from '../common/execution-provider';
import { ConfigService } from '../common/config';
import { PrometheusService } from '../common/prometheus';
import { StakingRouterService } from '../staking-router-modules/staking-router.service';
import { AppModule } from './app-testing.module';

dotenv.config();
jest.setTimeout(100_000);

describe('Simple DVT deploy', () => {
  let sdk: chronix.SDK;
  let session: chronix.HardhatSession;
  let deployState: chronix.StoryResult<'simple-dvt/deploy'>;
  let reduceNOState: chronix.StoryResult<'simple-dvt/reduce-no'>;
  let sdvtNodeOperator1: chronix.StoryResult<'simple-dvt/add-node-operator'>;

  let moduleRef: TestingModule;

  let keysStorageService: RegistryKeyStorageService;
  let moduleStorageService: SRModuleStorageService;
  let elMetaStorageService: ElMetaStorageService;

  let stakingRouterService: StakingRouterService;
  let keysUpdateService: KeysUpdateService;

  // let prevBlockNumber = 0;

  beforeAll(async () => {
    sdk = await createSDK('http://localhost:8001');
    const forkUrl = process.env.CHRONIX_PROVIDER_MAINNET_URL;

    if (!forkUrl || forkUrl.length < 1) {
      console.log('forkUrl', forkUrl);
      console.log('PROVIDERS_URLS', process.env.PROVIDERS_URLS, !!process.env.PROVIDERS_URLS);
      throw new Error('CHRONIX_PROVIDER_MAINNET_URL is not valid');
    }

    session = await sdk.env.hardhat({
      fork: forkUrl,
      chainId: 1,
    });

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
          const conf = { LIDO_LOCATOR_ADDRESS: '0xC1d0b3DE6792Bf6b4b37EccdcC24e45978Cfd2Eb' };
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

  test('reduce NO keys', async () => {
    reduceNOState = await session.story('simple-dvt/reduce-no', {});
    expect((await session.provider.getBlock('latest')).number).toBeGreaterThan(0);
    expect(reduceNOState).toBeDefined();
    expect(reduceNOState.nodeOperatorsCount).toBe(2);
  });

  test('fetch initial keys', async () => {
    await keysUpdateService.update();

    const srModules = await stakingRouterService.getStakingModules();
    expect(srModules).toHaveLength(1);

    const keysTotal = Object.values(reduceNOState.operators)
      .map((op) => op.totalAddedValidators)
      .reduce((sum, kCount) => (sum += kCount), 0);

    for (const [, srModule] of srModules.entries()) {
      const moduleInstance = stakingRouterService.getStakingRouterModuleImpl(srModule.type);
      const keys = await moduleInstance.getKeys(srModule.stakingModuleAddress, {});
      const operators = await moduleInstance.getOperators(srModule.stakingModuleAddress);

      expect(operators).toHaveLength(2);
      expect(keys).toHaveLength(keysTotal);
    }
  });

  test('deploy simple dvt', async () => {
    deployState = await session.story('simple-dvt/deploy', {});
    expect((await session.provider.getBlock('latest')).number).toBeGreaterThan(0);
    expect(deployState).toBeDefined();
    expect(deployState.isAppReady).toBeTruthy();
    expect(deployState.lidoLocatorAddress).toBeDefined();
    expect(deployState.stakingRouterData.stakingModuleIds).toHaveLength(2);
  });

  test('module must be added to keys api', async () => {
    await keysUpdateService.update();

    const srModules = await stakingRouterService.getStakingModules();
    expect(srModules).toHaveLength(2);
  });

  test('simple dvt module must be empty', async () => {
    const simpleDvtState = deployState.stakingRouterData.stakingModules[1];

    const moduleInstance = stakingRouterService.getStakingRouterModuleImpl(simpleDvtState.type);
    const keys = await moduleInstance.getKeys(simpleDvtState.stakingModuleAddress, {});
    const operators = await moduleInstance.getOperators(simpleDvtState.stakingModuleAddress);

    expect(keys).toHaveLength(0);
    expect(operators).toHaveLength(0);
  });

  test('add simple-dvt node operator with key', async () => {
    const simpleDvtState = deployState.stakingRouterData.stakingModules[1];

    sdvtNodeOperator1 = await session.story('simple-dvt/add-node-operator', {
      norAddress: simpleDvtState.stakingModuleAddress,
      name: 'simple dvt operator',
      rewardAddress: '0x' + '5'.repeat(40),
    });

    await session.story('simple-dvt/add-node-operator-keys', {
      norAddress: simpleDvtState.stakingModuleAddress,
      keysCount: 1,
      keys: '0x' + '5'.repeat(96),
      signatures: '0x' + '5'.repeat(192),
      noId: sdvtNodeOperator1.nodeOperatorId,
    });

    await keysUpdateService.update();

    const moduleInstance = stakingRouterService.getStakingRouterModuleImpl(simpleDvtState.type);
    const keys = await moduleInstance.getKeys(simpleDvtState.stakingModuleAddress, {});
    const operators = await moduleInstance.getOperators(simpleDvtState.stakingModuleAddress);

    expect(keys).toHaveLength(1);
    expect(operators).toHaveLength(1);
    expect(operators[0].name).toBe(sdvtNodeOperator1.name);
  });
});
