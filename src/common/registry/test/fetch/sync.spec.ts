import { ModuleMetadata } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getNetwork } from '@ethersproject/networks';
import { hexZeroPad } from '@ethersproject/bytes';
import { getDefaultProvider, Provider } from '@ethersproject/providers';
import { RegistryFetchModule, RegistryFetchService } from '../../';
import { LIDO_CONTRACT_TOKEN, Lido } from '@lido-nestjs/contracts';
import { REGISTRY_CONTRACT_TOKEN, Registry } from '@lido-nestjs/contracts';
import { LoggerModule, nullTransport } from '@lido-nestjs/logger';

describe('Sync module initializing', () => {
  const provider = getDefaultProvider(process.env.PROVIDERS_URLS);

  jest.spyOn(provider, 'detectNetwork').mockImplementation(async () => getNetwork('mainnet'));

  const testModules = async (metadata: ModuleMetadata) => {
    const moduleRef = await Test.createTestingModule(metadata).compile();
    const fetchService: RegistryFetchService = moduleRef.get(RegistryFetchService);

    expect(fetchService).toBeDefined();
    return moduleRef;
  };

  test('forRoot', async () => {
    const imports = [
      RegistryFetchModule.forRoot({ provider }),
      LoggerModule.forRoot({ transports: [nullTransport()] }),
    ];
    await testModules({ imports });
  });

  test('forFeature', async () => {
    const imports = [
      RegistryFetchModule.forFeature({ provider }),
      LoggerModule.forRoot({ transports: [nullTransport()] }),
    ];
    await testModules({ imports });
  });

  test('forFeature global provider', async () => {
    const imports = [RegistryFetchModule.forFeature(), LoggerModule.forRoot({ transports: [nullTransport()] })];
    const metadata = {
      imports,
      providers: [{ provide: Provider, useValue: provider }],
    };
    await testModules(metadata);
  });

  test('forFeature addresses', async () => {
    const registryAddress = hexZeroPad('0x02', 20);

    const imports = [
      RegistryFetchModule.forFeature({
        provider,
        registryAddress,
      }),
      LoggerModule.forRoot({ transports: [nullTransport()] }),
    ];

    const moduleRef = await testModules({ imports });

    const registryContract: Registry = moduleRef.get(REGISTRY_CONTRACT_TOKEN);
    expect(registryContract.address).toBe(registryAddress);
  });
});
