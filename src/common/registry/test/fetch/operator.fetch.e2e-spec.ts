import { Global, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JsonRpcBatchProvider } from '@ethersproject/providers';
import { isAddress } from '@ethersproject/address';
import { Registry__factory, StakingRouter__factory } from 'generated';
import { REGISTRY_CONTRACT_TOKEN } from 'common/contracts';
import { RegistryFetchModule, RegistryOperatorFetchService } from '../../';
import { LIDO_LOCATOR_CONTRACT_ADDRESSES, LidoLocator__factory } from '@lido-nestjs/contracts';
import * as dotenv from 'dotenv';
import { LoggerModule, nullTransport } from '@lido-nestjs/logger';

dotenv.config();

describe('Operators', () => {
  const provider = new JsonRpcBatchProvider(process.env.PROVIDERS_URLS);
  if (!process.env.CHAIN_ID) {
    console.error(process.env.CHAIN_ID, process.env.PROVIDERS_URLS, "CHAIN_ID wasn't provides");
    process.exit(1);
  }
  const chainId = process.env.CHAIN_ID as any;

  let address: string;
  let fetchService: RegistryOperatorFetchService;

  const connectRegistry = (addr: string) => Registry__factory.connect(addr, provider);

  @Global()
  @Module({
    providers: [{ provide: REGISTRY_CONTRACT_TOKEN, useValue: connectRegistry }],
    exports: [REGISTRY_CONTRACT_TOKEN],
  })
  class MockContractsModule {}

  beforeAll(async () => {
    const locatorAddress = LIDO_LOCATOR_CONTRACT_ADDRESSES[chainId];
    const locator = LidoLocator__factory.connect(locatorAddress, provider);
    const stakingRouterAddress = await locator.stakingRouter();
    const stakingRouter = StakingRouter__factory.connect(stakingRouterAddress, provider);
    const modules = await stakingRouter.getStakingModules();
    address = modules[0].stakingModuleAddress.toLowerCase();
  }, 30_000);

  beforeEach(async () => {
    const imports = [
      MockContractsModule,
      RegistryFetchModule.forFeature(),
      LoggerModule.forRoot({ transports: [nullTransport()] }),
    ];
    const moduleRef = await Test.createTestingModule({ imports }).compile();
    fetchService = moduleRef.get(RegistryOperatorFetchService);
  });

  test('count', async () => {
    const count = await fetchService.count(address);
    expect(typeof count).toBe('number');
    expect(count).toBeGreaterThan(0);
  });

  test('fetch one operator', async () => {
    const block = await provider.getBlock('latest');
    const operator = await fetchService.fetchOne(address, 0, {
      blockTag: block.hash,
    });

    expect(operator).toBeInstanceOf(Object);
    expect(typeof operator.active).toBe('boolean');

    expect(typeof operator.index).toBe('number');
    expect(typeof operator.stakingLimit).toBe('number');
    expect(typeof operator.stoppedValidators).toBe('number');
    expect(typeof operator.totalSigningKeys).toBe('number');
    expect(typeof operator.usedSigningKeys).toBe('number');
    expect(typeof operator.finalizedUsedSigningKeys).toBe('number');

    expect(typeof operator.name).toBe('string');
    expect(isAddress(operator.rewardAddress)).toBe(true);
    expect(isAddress(operator.moduleAddress)).toBe(true);
  });

  test('fetch all operators', async () => {
    const block = await provider.getBlock('latest');
    const operators = await fetchService.fetch(address, 0, -1, {
      blockTag: block.hash,
    });

    expect(operators).toBeInstanceOf(Array);
    expect(operators.length).toBeGreaterThan(0);
  }, 30_000);

  test('fetch multiply operators', async () => {
    const block = await provider.getBlock('latest');
    const operators = await fetchService.fetch(address, 1, 3, {
      blockTag: block.hash,
    });

    expect(operators).toBeInstanceOf(Array);
    expect(operators.length).toBe(2);
    expect(operators[0].index).toBe(1);
    expect(operators[1].index).toBe(2);
  });
});
