import { ModuleMetadata } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { nullTransport, LoggerModule } from '@lido-nestjs/logger';
import { getNetwork } from '@ethersproject/networks';
import { getDefaultProvider } from '@ethersproject/providers';
import { KeyRegistryModule, KeyRegistryService, RegistryStorageService } from '../..';
import { MikroORM } from '@mikro-orm/core';
import { DatabaseE2ETestingModule } from 'app';
import { SimpleFallbackJsonRpcBatchProvider } from '@lido-nestjs/execution';
import { ExecutionProviderModule } from 'common/execution-provider';
import { ConfigModule } from 'common/config';
import { PrometheusModule } from 'common/prometheus';

describe('Async module initializing', () => {
  const provider = getDefaultProvider('mainnet');

  jest.spyOn(provider, 'detectNetwork').mockImplementation(async () => getNetwork('mainnet'));

  const testModules = async (imports: ModuleMetadata['imports']) => {
    const moduleRef = await Test.createTestingModule({ imports })
      .overrideProvider(SimpleFallbackJsonRpcBatchProvider)
      .useValue(provider)
      .compile();
    const registryService: KeyRegistryService = moduleRef.get(KeyRegistryService);
    const storageService = moduleRef.get(RegistryStorageService);

    const generator = moduleRef.get(MikroORM).getSchemaGenerator();
    await generator.refreshDatabase();
    await generator.clearDatabase();

    expect(registryService).toBeDefined();
    await storageService.onModuleDestroy();
  };

  test('forRootAsync', async () => {
    await testModules([
      ExecutionProviderModule,
      DatabaseE2ETestingModule.forRoot(),
      LoggerModule.forRoot({ transports: [nullTransport()] }),
      KeyRegistryModule.forRootAsync({
        async useFactory() {
          return { provider, subscribeInterval: '*/12 * * * * *' };
        },
      }),
      ConfigModule,
      PrometheusModule,
    ]);
  });

  test('forFeatureAsync', async () => {
    await testModules([
      ExecutionProviderModule,
      DatabaseE2ETestingModule.forRoot(),
      LoggerModule.forRoot({ transports: [nullTransport()] }),
      KeyRegistryModule.forFeatureAsync({
        async useFactory() {
          return { provider, subscribeInterval: '*/12 * * * * *' };
        },
      }),
      ConfigModule,
      PrometheusModule,
    ]);
  });
});
