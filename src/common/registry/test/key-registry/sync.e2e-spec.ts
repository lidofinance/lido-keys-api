import { nullTransport, LoggerModule } from '@lido-nestjs/logger';
import { Global, Module, ModuleMetadata } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { REGISTRY_CONTRACT_TOKEN } from 'common/contracts';
import { KeyRegistryModule, KeyRegistryService, RegistryStorageService } from 'common/registry';
import { MikroORM } from '@mikro-orm/core';
import { DatabaseE2ETestingModule } from 'app';
import { PrometheusModule } from 'common/prometheus';

describe('Sync module initializing', () => {
  const mockConnectRegistry = jest.fn();

  @Global()
  @Module({
    providers: [{ provide: REGISTRY_CONTRACT_TOKEN, useValue: mockConnectRegistry }],
    exports: [REGISTRY_CONTRACT_TOKEN],
  })
  class MockContractsModule {}

  const testModules = async (metadata: ModuleMetadata) => {
    const moduleRef = await Test.createTestingModule(metadata).compile();
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
      MockContractsModule,
      DatabaseE2ETestingModule.forRoot(),
      LoggerModule.forRoot({ transports: [nullTransport()] }),
      KeyRegistryModule.forRoot({
        subscribeInterval: '*/12 * * * * *',
      }),
      PrometheusModule,
    ];
    await testModules({ imports });
  });

  test('forFeature', async () => {
    const imports = [
      MockContractsModule,
      DatabaseE2ETestingModule.forRoot(),
      LoggerModule.forRoot({ transports: [nullTransport()] }),
      KeyRegistryModule.forFeature({
        subscribeInterval: '*/12 * * * * *',
      }),
      PrometheusModule,
    ];
    await testModules({ imports });
  });
});
