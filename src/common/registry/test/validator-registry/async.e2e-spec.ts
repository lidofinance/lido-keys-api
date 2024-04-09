import { ModuleMetadata } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { nullTransport, LoggerModule } from '@catalist-nestjs/logger';
import { getNetwork } from '@ethersproject/networks';
import { getDefaultProvider } from '@ethersproject/providers';
import { ValidatorRegistryModule, ValidatorRegistryService, RegistryStorageService } from '../..';
import { MikroORM } from '@mikro-orm/core';
import { DatabaseE2ETestingModule } from 'app';

describe('Async module initializing', () => {
  const provider = getDefaultProvider('mainnet');

  jest.spyOn(provider, 'detectNetwork').mockImplementation(async () => getNetwork('mainnet'));

  const testModules = async (imports: ModuleMetadata['imports']) => {
    const moduleRef = await Test.createTestingModule({ imports }).compile();
    const registryService: ValidatorRegistryService = moduleRef.get(ValidatorRegistryService);
    const storageService = moduleRef.get(RegistryStorageService);

    const generator = moduleRef.get(MikroORM).getSchemaGenerator();
    await generator.refreshDatabase();
    await generator.clearDatabase();

    expect(registryService).toBeDefined();
    await storageService.onModuleDestroy();
  };

  test('forRootAsync', async () => {
    await testModules([
      DatabaseE2ETestingModule.forRoot(),
      LoggerModule.forRoot({ transports: [nullTransport()] }),
      ValidatorRegistryModule.forRootAsync({
        async useFactory() {
          return { provider, subscribeInterval: '*/12 * * * * *' };
        },
      }),
    ]);
  });

  test('forFeatureAsync', async () => {
    await testModules([
      DatabaseE2ETestingModule.forRoot(),
      LoggerModule.forRoot({ transports: [nullTransport()] }),
      ValidatorRegistryModule.forFeatureAsync({
        async useFactory() {
          return { provider, subscribeInterval: '*/12 * * * * *' };
        },
      }),
    ]);
  });
});
