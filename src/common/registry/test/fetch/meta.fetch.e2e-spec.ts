import { Global, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { LidoLocator__factory, Registry__factory, StakingRouter__factory } from 'generated';
import { REGISTRY_CONTRACT_TOKEN } from 'common/contracts';
import { RegistryFetchModule, RegistryMetaFetchService } from '../../';
import { LIDO_LOCATOR_CONTRACT_ADDRESSES } from 'common/contracts';
import * as dotenv from 'dotenv';
import { LoggerModule, nullTransport } from '@lido-nestjs/logger';
import { JsonRpcBatchProvider } from '@ethersproject/providers';

dotenv.config();

describe('Operators', () => {
  const provider = new JsonRpcBatchProvider(process.env.PROVIDERS_URLS);

  if (!process.env.CHAIN_ID) {
    console.error("CHAIN_ID wasn't provides");
    process.exit(1);
  }
  const chainId = process.env.CHAIN_ID as any;

  let address: string;
  let fetchService: RegistryMetaFetchService;

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
    fetchService = moduleRef.get(RegistryMetaFetchService);
  });

  test('fetch nonce', async () => {
    const nonce = await fetchService.fetchStakingModuleNonce(address);
    expect(typeof nonce).toBe('number');
    expect(nonce).toBeGreaterThan(0);
  });
});
