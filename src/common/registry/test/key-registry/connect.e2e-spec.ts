import { Global, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { nullTransport, LoggerModule } from '@lido-nestjs/logger';
import { FallbackProviderModule, SimpleFallbackJsonRpcBatchProvider } from '@lido-nestjs/execution';
import { Registry__factory, StakingRouter__factory, Registry } from 'generated';
import { KeyRegistryModule, KeyRegistryService, RegistryStorageService } from '../../';
import { RegistryOperator } from '../../fetch/interfaces/operator.interface';
import { clearDb } from '../testing.utils';
import { MikroORM } from '@mikro-orm/core';
import { LIDO_LOCATOR_CONTRACT_ADDRESSES, LidoLocator__factory } from '@lido-nestjs/contracts';
import { REGISTRY_CONTRACT_TOKEN, ContractFactoryFn } from 'common/contracts';
import * as dotenv from 'dotenv';
import { DatabaseE2ETestingModule } from 'app';
import { PrometheusModule } from 'common/prometheus';

dotenv.config();

describe('Registry', () => {
  if (!process.env.CHAIN_ID) {
    console.error("CHAIN_ID wasn't provides");
    process.exit(1);
  }
  const chainId = Number(process.env.CHAIN_ID);

  const MAX_KEYS_PER_OPERATOR = 5;
  const OPERATORS_COUNT = 2;

  let address: string;
  let cappedOperators: RegistryOperator[];
  let registryService: KeyRegistryService;
  let storageService: RegistryStorageService;
  let provider: SimpleFallbackJsonRpcBatchProvider;
  let mikroOrm: MikroORM;

  // SimpleFallbackJsonRpcBatchProvider supports EIP-1898
  // blockTag: { blockHash } format that abstract-registry uses
  @Global()
  @Module({
    providers: [
      {
        provide: REGISTRY_CONTRACT_TOKEN,
        useFactory: (provider: SimpleFallbackJsonRpcBatchProvider): ContractFactoryFn<Registry> => {
          return (addr: string) => Registry__factory.connect(addr, provider);
        },
        inject: [SimpleFallbackJsonRpcBatchProvider],
      },
    ],
    exports: [REGISTRY_CONTRACT_TOKEN],
  })
  class MockContractsModule {}

  beforeEach(async () => {
    const imports = [
      FallbackProviderModule.forRoot({
        urls: [process.env.PROVIDERS_URLS as string],
        network: chainId,
      }),
      MockContractsModule,
      DatabaseE2ETestingModule.forRoot(),
      LoggerModule.forRoot({ transports: [nullTransport()] }),
      KeyRegistryModule.forFeature(),
      PrometheusModule,
    ];
    const moduleRef = await Test.createTestingModule({ imports }).compile();
    registryService = moduleRef.get(KeyRegistryService);
    storageService = moduleRef.get(RegistryStorageService);
    provider = moduleRef.get(SimpleFallbackJsonRpcBatchProvider);

    mikroOrm = moduleRef.get(MikroORM);
    const generator = mikroOrm.getSchemaGenerator();
    await generator.refreshDatabase();
    await generator.clearDatabase();

    // Resolve module address
    const locatorAddress = LIDO_LOCATOR_CONTRACT_ADDRESSES[chainId];
    const locator = LidoLocator__factory.connect(locatorAddress, provider);
    const stakingRouterAddress = await locator.stakingRouter();
    const stakingRouter = StakingRouter__factory.connect(stakingRouterAddress, provider);
    const modules = await stakingRouter.getStakingModules();
    address = modules[0].stakingModuleAddress.toLowerCase();

    // Fetch first 2 operators from real contract, then cap values
    const registry = Registry__factory.connect(address, provider);
    const block = await provider.getBlock('latest');

    const rawOperators: RegistryOperator[] = [];
    for (let i = 0; i < OPERATORS_COUNT; i++) {
      const op = await registry.getNodeOperator(i, true, { blockTag: block.hash });
      rawOperators.push({
        index: i,
        active: op.active,
        name: op.name,
        rewardAddress: op.rewardAddress,
        stakingLimit: op.totalVettedValidators.toNumber(),
        stoppedValidators: op.totalExitedValidators.toNumber(),
        totalSigningKeys: op.totalAddedValidators.toNumber(),
        usedSigningKeys: op.totalDepositedValidators.toNumber(),
        moduleAddress: address,
        finalizedUsedSigningKeys: op.totalDepositedValidators.toNumber(),
      });
    }

    // Cap to small values: 5 total, 3 used, 2 finalized
    cappedOperators = rawOperators.map((op) => ({
      ...op,
      totalSigningKeys: MAX_KEYS_PER_OPERATOR,
      usedSigningKeys: MAX_KEYS_PER_OPERATOR - 2,
      finalizedUsedSigningKeys: MAX_KEYS_PER_OPERATOR - 3,
    }));

    // Return pre-fetched capped operators — no extra contract calls during update()
    jest.spyOn(registryService, 'getOperatorsFromContract').mockImplementation(async () => cappedOperators);
  }, 30_000);

  afterEach(async () => {
    await clearDb(mikroOrm);
    await storageService.onModuleDestroy();
    jest.restoreAllMocks();
  });

  test('Update', async () => {
    const block = await provider.getBlock('latest');
    await registryService.update(address, block.hash);

    const operators = await registryService.getOperatorsFromStorage(address);
    expect(operators.length).toEqual(OPERATORS_COUNT);

    const keys = await registryService.getOperatorsKeysFromStorage(address);
    expect(keys.length).toBeGreaterThan(0);
    expect(keys.length).toBeLessThanOrEqual(MAX_KEYS_PER_OPERATOR * OPERATORS_COUNT);

    // verify each operator has correct capped values
    for (const operator of operators) {
      expect(operator.totalSigningKeys).toEqual(MAX_KEYS_PER_OPERATOR);
      expect(operator.finalizedUsedSigningKeys).toBeLessThan(operator.totalSigningKeys);
    }

    // count keys per operator in DB
    for (const operator of operators) {
      const operatorKeys = keys.filter((k) => k.operatorIndex === operator.index);
      expect(operatorKeys.length).toEqual(operator.totalSigningKeys);
    }

    // second update: keys [0, finalizedUsedSigningKeys) are immutable,
    // keys [finalizedUsedSigningKeys, totalSigningKeys) are re-fetched
    const saveKeysMock = jest.spyOn(registryService, 'saveKeys');
    await registryService.update(address, block.hash);

    // verify that keys were actually re-fetched (not skipped)
    expect(saveKeysMock.mock.calls.length).toEqual(OPERATORS_COUNT);

    // keys count unchanged after second update
    const keysAfterSecondUpdate = await registryService.getOperatorsKeysFromStorage(address);
    expect(keysAfterSecondUpdate.length).toEqual(keys.length);
  }, 30_000);
});
