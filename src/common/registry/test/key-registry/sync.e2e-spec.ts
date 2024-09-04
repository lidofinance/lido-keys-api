import { nullTransport, LoggerModule } from '@lido-nestjs/logger';
import { ModuleMetadata } from '@nestjs/common';
import { getNetwork } from '@ethersproject/networks';
import { getDefaultProvider, Provider } from '@ethersproject/providers';
import { Test } from '@nestjs/testing';
import { KeyRegistryModule, KeyRegistryService, RegistryStorageService } from '../../index';
import { MikroORM } from '@mikro-orm/core';
import { DatabaseE2ETestingModule } from 'app';
import { ExecutionProviderModule } from 'common/execution-provider';
import { SimpleFallbackJsonRpcBatchProvider } from '@lido-nestjs/execution';
import { PrometheusModule } from 'common/prometheus';

describe('Sync module initializing', () => {
  const provider = getDefaultProvider('mainnet');

  jest.spyOn(provider, 'detectNetwork').mockImplementation(async () => getNetwork('mainnet'));

  const testModules = async (metadata: ModuleMetadata) => {
    const moduleRef = await Test.createTestingModule(metadata)
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

  test('forRoot', async () => {
    const imports = [
      ExecutionProviderModule,
      DatabaseE2ETestingModule.forRoot(),
      LoggerModule.forRoot({ transports: [nullTransport()] }),
      KeyRegistryModule.forRoot({
        provider,
        subscribeInterval: '*/12 * * * * *',
      }),
      PrometheusModule,
    ];
    await testModules({ imports });
  });

  test('forFeature', async () => {
    const imports = [
      ExecutionProviderModule,
      DatabaseE2ETestingModule.forRoot(),
      LoggerModule.forRoot({ transports: [nullTransport()] }),
      KeyRegistryModule.forFeature({
        provider,
        subscribeInterval: '*/12 * * * * *',
      }),
      PrometheusModule,
    ];
    await testModules({ imports });
  });

  test('forFeature + global provider', async () => {
    const imports = [
      ExecutionProviderModule,
      DatabaseE2ETestingModule.forRoot(),
      LoggerModule.forRoot({ transports: [nullTransport()] }),
      KeyRegistryModule.forFeature(),
      PrometheusModule,
    ];

    const metadata = {
      imports,
      providers: [{ provide: Provider, useValue: provider }],
    };

    await testModules(metadata);
  });
});
