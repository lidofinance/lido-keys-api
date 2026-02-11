import { Global, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JsonRpcBatchProvider } from '@ethersproject/providers';
import { Registry__factory, StakingRouter__factory } from 'generated';
import { REGISTRY_CONTRACT_TOKEN } from 'common/contracts';
import { RegistryFetchModule, RegistryKeyBatchFetchService } from '../../';
import { LIDO_LOCATOR_CONTRACT_ADDRESSES, LidoLocator__factory } from '@lido-nestjs/contracts';
import * as dotenv from 'dotenv';
import { LoggerModule, nullTransport } from '@lido-nestjs/logger';

dotenv.config();

describe('Fetch keys in batch', () => {
  const provider = new JsonRpcBatchProvider(process.env.PROVIDERS_URLS);
  if (!process.env.CHAIN_ID) {
    console.error("CHAIN_ID wasn't provides");
    process.exit(1);
  }
  const chainId = process.env.CHAIN_ID as any; // keyof typeof LIDO_LOCATOR_CONTRACT_ADDRESSES;

  let address: string;
  let fetchService: RegistryKeyBatchFetchService;

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
    fetchService = moduleRef.get(RegistryKeyBatchFetchService);
  });

  test('fetch one key', async () => {
    const operatorIndex = 0;
    // we dont check here correctness of vetted keys identification, so just use fake stake limit
    const fakeStakingLimit = 500;

    const block = await provider.getBlock('latest');
    const overrides = { blockTag: block.hash };
    const keys = await fetchService.fetch(address, operatorIndex, fakeStakingLimit, 0, 3, overrides);

    expect(keys).toBeInstanceOf(Array);

    expect(keys.length).toBe(3);

    expect(keys[0].index).toBe(0);
    expect(keys[0].operatorIndex).toBe(operatorIndex);
    expect(keys[0].moduleAddress).toBe(address);
    expect(keys[0].used).toBe(true);
    expect(keys[0].vetted).toBe(true);

    expect(keys[1].index).toBe(1);
    expect(keys[1].operatorIndex).toBe(operatorIndex);
    expect(keys[1].moduleAddress).toBe(address);
    expect(keys[1].used).toBe(true);
    expect(keys[1].vetted).toBe(true);

    expect(keys[2].index).toBe(2);
    expect(keys[2].operatorIndex).toBe(operatorIndex);
    expect(keys[2].moduleAddress).toBe(address);
    expect(keys[2].used).toBe(true);
    expect(keys[2].vetted).toBe(true);
  }, 30_000);
});
