import { Test } from '@nestjs/testing';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { meta } from '../fixtures/meta.fixture';
import { RegistryStorageModule, RegistryStorageService, RegistryMetaStorageService } from '../../';
import { MikroORM } from '@mikro-orm/core';

describe('Meta', () => {
  let storageService: RegistryMetaStorageService;
  let registryService: RegistryStorageService;

  beforeEach(async () => {
    const imports = [
      MikroOrmModule.forRoot({
        dbName: ':memory:',
        type: 'sqlite',
        allowGlobalContext: true,
        entities: ['./**/*.entity.ts'],
      }),
      RegistryStorageModule.forFeature(),
    ];

    const moduleRef = await Test.createTestingModule({ imports }).compile();
    storageService = moduleRef.get(RegistryMetaStorageService);
    registryService = moduleRef.get(RegistryStorageService);

    const generator = moduleRef.get(MikroORM).getSchemaGenerator();
    await generator.updateSchema();
  });

  afterEach(async () => {
    await registryService.onModuleDestroy();
  });

  test('save meta', async () => {
    await expect(storageService.get()).resolves.toEqual(null);
    await storageService.save(meta);
    await expect(storageService.get()).resolves.toEqual(meta);
  });

  test('remove meta', async () => {
    await storageService.save(meta);
    await expect(storageService.get()).resolves.toEqual(meta);
    await storageService.remove();
    await expect(storageService.get()).resolves.toEqual(null);
  });
});
