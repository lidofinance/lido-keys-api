import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ModuleMetadata } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { nullTransport, LoggerModule } from '@lido-nestjs/logger';
import { getNetwork } from '@ethersproject/networks';
import { getDefaultProvider } from '@ethersproject/providers';
import { KeyRegistryModule, KeyRegistryService, RegistryStorageService } from '../../';
import { MikroORM } from '@mikro-orm/core';
import { mikroORMConfig } from '../testing.utils';

describe('Async module initializing', () => {
  const provider = getDefaultProvider('mainnet');

  jest.spyOn(provider, 'detectNetwork').mockImplementation(async () => getNetwork('mainnet'));

  const testModules = async (imports: ModuleMetadata['imports']) => {
    const moduleRef = await Test.createTestingModule({ imports }).compile();
    const registryService: KeyRegistryService = moduleRef.get(KeyRegistryService);
    const storageService = moduleRef.get(RegistryStorageService);

    const generator = moduleRef.get(MikroORM).getSchemaGenerator();
    await generator.updateSchema();

    expect(registryService).toBeDefined();
    await storageService.onModuleDestroy();
  };

  test('forRootAsync', async () => {
    await testModules([
      MikroOrmModule.forRoot(mikroORMConfig),
      LoggerModule.forRoot({ transports: [nullTransport()] }),
      KeyRegistryModule.forRootAsync({
        async useFactory() {
          return { provider, subscribeInterval: '*/12 * * * * *' };
        },
      }),
    ]);
  });

  test('forFeatureAsync', async () => {
    await testModules([
      MikroOrmModule.forRoot({
        dbName: ':memory:',
        type: 'sqlite',
        allowGlobalContext: true,
        entities: ['./**/*.entity.ts'],
      }),
      LoggerModule.forRoot({ transports: [nullTransport()] }),
      KeyRegistryModule.forFeatureAsync({
        async useFactory() {
          return { provider, subscribeInterval: '*/12 * * * * *' };
        },
      }),
    ]);
  });
});
