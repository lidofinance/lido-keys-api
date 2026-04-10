import { DynamicModule, Global, Injectable, Module } from '@nestjs/common';
import { ModuleMetadata } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getNetwork } from '@ethersproject/networks';
import { getDefaultProvider, BaseProvider } from '@ethersproject/providers';
import { RegistryFetchModule, RegistryFetchService } from 'common/registry';
import { Registry__factory } from 'generated';
import { REGISTRY_CONTRACT_TOKEN } from 'common/contracts';
import { LoggerModule, nullTransport } from '@lido-nestjs/logger';

@Injectable()
class TestService {
  provider: BaseProvider;

  constructor() {
    this.provider = getDefaultProvider(process.env.PROVIDERS_URLS);
    jest.spyOn(this.provider, 'detectNetwork').mockImplementation(async () => getNetwork('mainnet'));
  }
}

@Global()
@Module({
  providers: [
    TestService,
    {
      provide: REGISTRY_CONTRACT_TOKEN,
      useFactory: (testService: TestService) => {
        return (address: string) => Registry__factory.connect(address, testService.provider);
      },
      inject: [TestService],
    },
  ],
  exports: [TestService, REGISTRY_CONTRACT_TOKEN],
})
class TestModule {
  static forRoot(): DynamicModule {
    return {
      module: TestModule,
      global: true,
    };
  }
}

describe('Async module initializing', () => {
  const testModules = async (imports: ModuleMetadata['imports']) => {
    const moduleRef = await Test.createTestingModule({ imports }).compile();
    const fetchService: RegistryFetchService = moduleRef.get(RegistryFetchService);

    expect(fetchService).toBeDefined();
  };

  test('forRootAsync', async () => {
    await testModules([
      LoggerModule.forRoot({ transports: [nullTransport()] }),
      TestModule.forRoot(),
      RegistryFetchModule.forRootAsync({
        async useFactory() {
          return {};
        },
      }),
    ]);
  });

  test('forFeatureAsync', async () => {
    await testModules([
      LoggerModule.forRoot({ transports: [nullTransport()] }),
      TestModule.forRoot(),
      RegistryFetchModule.forFeatureAsync({
        async useFactory() {
          return {};
        },
      }),
    ]);
  });
});
