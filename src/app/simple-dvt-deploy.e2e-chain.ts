import { SimpleFallbackJsonRpcBatchProvider } from '@lido-nestjs/execution';
import { MikroORM } from '@mikro-orm/core';
import { Test, TestingModule } from '@nestjs/testing';

import { createSDK, chronix } from 'chronix';
import * as dotenv from 'dotenv';

import { RegistryKeyStorageService } from '../common/registry';
import { ElMetaStorageService } from '../storage/el-meta.storage';
import { SRModuleStorageService } from '../storage/sr-module.storage';
import { KeysUpdateService } from '../jobs/keys-update';
import { ExecutionProvider } from '../common/execution-provider';
import { ConfigService } from '../common/config';
import { PrometheusService } from '../common/prometheus';
import { StakingRouterService } from '../staking-router-modules/staking-router.service';
import { AppModule } from './app-testing.module';

dotenv.config();
jest.setTimeout(100_000);

function convertAddressToLowerCase(input: string): string {
  const prefix = '0x';

  if (input.startsWith(prefix)) {
    const addressPart = input.slice(prefix.length);
    const lowercasedAddressPart = addressPart.toLowerCase();
    return `${prefix}${lowercasedAddressPart}`;
  } else {
    // If the input doesn't start with '0x', return it as is.
    return input;
  }
}

describe('Simple DVT deploy', () => {
  let sdk: chronix.SDK;
  let session: chronix.HardhatSession;
  let deployState: chronix.StoryResult<'simple-dvt/deploy'>;
  let reduceNOState: chronix.StoryResult<'simple-dvt/reduce-no'>;
  let sdvtNodeOperator1: chronix.StoryResult<'simple-dvt/add-node-operator'>;
  let dvtNodeOperator2WithoutKeys: chronix.StoryResult<'simple-dvt/set-node-operator-name'>;

  let moduleRef: TestingModule;
  let configService: ConfigService;
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
      throw new Error('CHRONIX_PROVIDER_MAINNET_URL is not valid');
    }

    session = await sdk.env.hardhat({
      fork: forkUrl,
      chainId: 1,
    });

    moduleRef = await Test.createTestingModule({ imports: [AppModule] })
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
      .compile();

    const generator = moduleRef.get(MikroORM).getSchemaGenerator();
    await generator.refreshDatabase();
    await generator.clearDatabase();

    configService = moduleRef.get(ConfigService);
    elMetaStorageService = moduleRef.get(ElMetaStorageService);
    keysStorageService = moduleRef.get(RegistryKeyStorageService);
    moduleStorageService = moduleRef.get(SRModuleStorageService);

    keysUpdateService = moduleRef.get(KeysUpdateService);
    stakingRouterService = moduleRef.get(StakingRouterService);

    jest.spyOn(configService, 'get').mockImplementation((path: any) => {
      if (path === 'LIDO_LOCATOR_ADDRESS') {
        return '0xC1d0b3DE6792Bf6b4b37EccdcC24e45978Cfd2Eb';
      }

      return configService.get(path);
    });
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

    const moduleInstance = stakingRouterService.getStakingRouterModuleImpl(srModules[0].type);
    const srModuleAddress = convertAddressToLowerCase(srModules[0].stakingModuleAddress);
    const keys = await moduleInstance.getKeys(srModuleAddress, {});
    const operators = await moduleInstance.getOperators(srModuleAddress);

    expect(operators).toHaveLength(2);
    expect(keys).toHaveLength(keysTotal);
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

    const srModuleAddress = convertAddressToLowerCase(simpleDvtState.stakingModuleAddress);
    const moduleInstance = stakingRouterService.getStakingRouterModuleImpl(simpleDvtState.type);
    const keys = await moduleInstance.getKeys(srModuleAddress, {});
    const operators = await moduleInstance.getOperators(srModuleAddress);
    const dvtModule = await stakingRouterService.getStakingModule(simpleDvtState.id);

    expect(dvtModule?.nonce).toEqual(0);
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

    const srModuleAddress = convertAddressToLowerCase(simpleDvtState.stakingModuleAddress);

    const moduleInstance = stakingRouterService.getStakingRouterModuleImpl(simpleDvtState.type);
    const keys = await moduleInstance.getKeys(srModuleAddress, {});
    const operators = await moduleInstance.getOperators(srModuleAddress);
    const dvtModule = await stakingRouterService.getStakingModule(simpleDvtState.id);

    expect(dvtModule?.nonce).toEqual(1);
    expect(keys).toHaveLength(1);
    expect(operators).toHaveLength(1);
    expect(operators[0].name).toBe(sdvtNodeOperator1.name);
  });

  test('add new simple-dvt node operator without key', async () => {
    const simpleDvtState = deployState.stakingRouterData.stakingModules[1];
    const srModuleAddress = convertAddressToLowerCase(simpleDvtState.stakingModuleAddress);
    const moduleInstance = stakingRouterService.getStakingRouterModuleImpl(simpleDvtState.type);
    dvtNodeOperator2WithoutKeys = await session.story('simple-dvt/add-node-operator', {
      norAddress: simpleDvtState.stakingModuleAddress,
      name: 'new simple dvt operator ',
      rewardAddress: '0x' + '6'.repeat(40),
    });
    await keysUpdateService.update();

    const currentKeys = await moduleInstance.getKeys(srModuleAddress, {});
    const currentOperators = await moduleInstance.getOperators(srModuleAddress);
    const dvtModule = await stakingRouterService.getStakingModule(simpleDvtState.id);

    expect(dvtModule?.nonce).toEqual(1);
    expect(currentKeys).toHaveLength(1);
    expect(currentOperators).toHaveLength(2);
    expect(currentOperators[1].name).toBe(dvtNodeOperator2WithoutKeys.name);
  });

  test('update operator name', async () => {
    const simpleDvtState = deployState.stakingRouterData.stakingModules[1];
    const srModuleAddress = convertAddressToLowerCase(simpleDvtState.stakingModuleAddress);
    const moduleInstance = stakingRouterService.getStakingRouterModuleImpl(simpleDvtState.type);

    await session.story('simple-dvt/set-node-operator-name', {
      norAddress: simpleDvtState.stakingModuleAddress,
      nodeOperatorId: dvtNodeOperator2WithoutKeys.nodeOperatorId,
      name: 'some other name',
    });

    await keysUpdateService.update();

    const keys1 = await moduleInstance.getKeys(srModuleAddress, {});
    const operators1 = await moduleInstance.getOperators(srModuleAddress);
    const dvtModule = await stakingRouterService.getStakingModule(simpleDvtState.id);

    expect(dvtModule?.nonce).toEqual(1);
    expect(keys1).toHaveLength(1);
    expect(operators1).toHaveLength(2);
    expect(operators1[1].name).toBe('some other name');
  });

  it('update operator reward address', async () => {
    const simpleDvtState = deployState.stakingRouterData.stakingModules[1];
    const srModuleAddress = convertAddressToLowerCase(simpleDvtState.stakingModuleAddress);
    const moduleInstance = stakingRouterService.getStakingRouterModuleImpl(simpleDvtState.type);

    await session.story('simple-dvt/set-node-operator-reward-address', {
      norAddress: simpleDvtState.stakingModuleAddress,
      nodeOperatorId: dvtNodeOperator2WithoutKeys.nodeOperatorId,
      rewardAddress: '0x' + '3'.repeat(40),
    });

    await keysUpdateService.update();

    const keys2 = await moduleInstance.getKeys(srModuleAddress, {});
    const operators2 = await moduleInstance.getOperators(srModuleAddress);
    const dvtModule = await stakingRouterService.getStakingModule(simpleDvtState.id);

    expect(dvtModule?.nonce).toEqual(1);
    expect(keys2).toHaveLength(1);
    expect(operators2).toHaveLength(2);
    expect(operators2[1].rewardAddress).toBe('0x' + '3'.repeat(40));
  });

  it('block is changing every iteration', async () => {
    const prevBlockNumber = (await session.provider.getBlock('latest')).number;
    await keysUpdateService.update();

    const prevElSnapshot = await stakingRouterService.getElBlockSnapshot();

    expect(prevElSnapshot).toBeDefined();
    expect(prevElSnapshot?.blockNumber).toBe(prevBlockNumber);

    //  mine new block
    await session.provider.evm_mine();
    const currentBlockNumber = (await session.provider.getBlock('latest')).number;
    // // check if the block has been changed
    expect(prevBlockNumber).toBeLessThan(currentBlockNumber);

    await keysUpdateService.update();

    const currentElSnapshot = await stakingRouterService.getElBlockSnapshot();

    expect(currentElSnapshot).toBeDefined();
    expect(currentElSnapshot?.blockNumber).toBe(currentBlockNumber);
  });
});
