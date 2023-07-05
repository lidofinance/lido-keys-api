import { DynamicModule, Injectable, Module } from '@nestjs/common';
import { ModuleMetadata } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getNetwork } from '@ethersproject/networks';
import { getDefaultProvider, BaseProvider } from '@ethersproject/providers';
import { RegistryFetchModule, RegistryFetchService } from '../../';

@Injectable()
class TestService {
  provider: BaseProvider;

  constructor() {
    this.provider = getDefaultProvider(process.env.EL_RPC_URL);
    jest.spyOn(this.provider, 'detectNetwork').mockImplementation(async () => getNetwork('mainnet'));
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
    const moduleRef = await Test.createTestingModule({ imports }).compile();
    const fetchService: RegistryFetchService = moduleRef.get(RegistryFetchService);

    expect(fetchService).toBeDefined();
  };

  test('forRootAsync', async () => {
    await testModules([
      TestModule.forRoot(),
      RegistryFetchModule.forRootAsync({
        async useFactory(testService: TestService) {
          return { provider: testService.provider };
        },
        inject: [TestService],
      }),
    ]);
  });

  test('forFeatureAsync', async () => {
    await testModules([
      TestModule.forRoot(),
      RegistryFetchModule.forFeatureAsync({
        async useFactory(testService: TestService) {
          return { provider: testService.provider };
        },
        inject: [TestService],
      }),
    ]);
  });
});
