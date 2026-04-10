import { Global, Module, ModuleMetadata } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getNetwork } from '@ethersproject/networks';
import { getDefaultProvider } from '@ethersproject/providers';
import { RegistryFetchModule, RegistryFetchService } from 'common/registry';
import { REGISTRY_CONTRACT_TOKEN, ContractFactoryFn } from 'common/contracts';
import { Registry } from 'generated';
import { LoggerModule, nullTransport } from '@lido-nestjs/logger';

describe('Sync module initializing', () => {
  const provider = getDefaultProvider(process.env.PROVIDERS_URLS);

  jest.spyOn(provider, 'detectNetwork').mockImplementation(async () => getNetwork('mainnet'));

  const mockConnectRegistry: ContractFactoryFn<Registry> = (address: string) =>
    ({ address, provider } as unknown as Registry);

  @Global()
  @Module({
    providers: [{ provide: REGISTRY_CONTRACT_TOKEN, useValue: mockConnectRegistry }],
    exports: [REGISTRY_CONTRACT_TOKEN],
  })
  class MockContractsModule {}

  const testModules = async (metadata: ModuleMetadata) => {
    const moduleRef = await Test.createTestingModule(metadata).compile();
    const fetchService: RegistryFetchService = moduleRef.get(RegistryFetchService);

    expect(fetchService).toBeDefined();
    return moduleRef;
  };

  test('forRoot', async () => {
    const imports = [
      MockContractsModule,
      RegistryFetchModule.forRoot(),
      LoggerModule.forRoot({ transports: [nullTransport()] }),
    ];
    await testModules({ imports });
  });

  test('forFeature', async () => {
    const imports = [
      MockContractsModule,
      RegistryFetchModule.forFeature(),
      LoggerModule.forRoot({ transports: [nullTransport()] }),
    ];
    await testModules({ imports });
  });
});
