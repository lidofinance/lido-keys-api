import { DynamicModule, Injectable, Module } from '@nestjs/common';
import { ModuleMetadata } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getNetwork } from '@ethersproject/networks';
import { getDefaultProvider, BaseProvider } from '@ethersproject/providers';
import { RegistryFetchModule, RegistryFetchService } from '../../';
import { LoggerModule, nullTransport } from '@lido-nestjs/logger';
import { ConfigModule } from 'common/config';
import { ExecutionProviderModule } from 'common/execution-provider';
import { PrometheusModule } from 'common/prometheus';
import { SimpleFallbackJsonRpcBatchProvider } from '@lido-nestjs/execution';

const provider = getDefaultProvider(process.env.PROVIDERS_URLS);
jest.spyOn(provider, 'detectNetwork').mockImplementation(async () => getNetwork('mainnet'));
@Injectable()
class TestService {
  provider: BaseProvider;

  constructor() {
    this.provider = provider;
  }
}
@Module({
  providers: [TestService],
  exports: [TestService],
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
    const moduleRef = await Test.createTestingModule({ imports })
      .overrideProvider(SimpleFallbackJsonRpcBatchProvider)
      .useValue(provider)
      .compile();
    const fetchService: RegistryFetchService = moduleRef.get(RegistryFetchService);

    expect(fetchService).toBeDefined();
  };

  test('forRootAsync', async () => {
    await testModules([
      ExecutionProviderModule,
      LoggerModule.forRoot({ transports: [nullTransport()] }),
      TestModule.forRoot(),
      RegistryFetchModule.forRootAsync({
        async useFactory(testService: TestService) {
          return { provider: testService.provider };
        },
        inject: [TestService],
      }),
      ConfigModule,
      PrometheusModule,
    ]);
  });

  test('forFeatureAsync', async () => {
    await testModules([
      ExecutionProviderModule,
      LoggerModule.forRoot({ transports: [nullTransport()] }),
      TestModule.forRoot(),
      RegistryFetchModule.forFeatureAsync({
        async useFactory(testService: TestService) {
          return { provider: testService.provider };
        },
        inject: [TestService],
      }),
      ConfigModule,
      PrometheusModule,
    ]);
  });
});
