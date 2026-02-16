import { Global, Module, ModuleMetadata } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { nullTransport, LoggerModule } from '@lido-nestjs/logger';
import { REGISTRY_CONTRACT_TOKEN } from 'common/contracts';
import { KeyRegistryModule, KeyRegistryService, RegistryStorageService } from '../..';
import { MikroORM } from '@mikro-orm/core';
import { DatabaseE2ETestingModule } from 'app';
import { PrometheusModule } from 'common/prometheus';

describe('Async module initializing', () => {
  const mockConnectRegistry = jest.fn();

  @Global()
  @Module({
    providers: [{ provide: REGISTRY_CONTRACT_TOKEN, useValue: mockConnectRegistry }],
    exports: [REGISTRY_CONTRACT_TOKEN],
  })
  class MockContractsModule {}

  const testModules = async (imports: ModuleMetadata['imports']) => {
    const moduleRef = await Test.createTestingModule({ imports }).compile();
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
      MockContractsModule,
      DatabaseE2ETestingModule.forRoot(),
      LoggerModule.forRoot({ transports: [nullTransport()] }),
      KeyRegistryModule.forRootAsync({
        async useFactory() {
          return { subscribeInterval: '*/12 * * * * *' };
        },
      }),
      PrometheusModule,
    ]);
  });

  test('forFeatureAsync', async () => {
    await testModules([
      MockContractsModule,
      DatabaseE2ETestingModule.forRoot(),
      LoggerModule.forRoot({ transports: [nullTransport()] }),
      KeyRegistryModule.forFeatureAsync({
        async useFactory() {
          return { subscribeInterval: '*/12 * * * * *' };
        },
      }),
      PrometheusModule,
    ]);
  });
});
