import { ModuleMetadata } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { RegistryStorageModule, RegistryStorageService } from '../..';
import { MikroORM } from '@mikro-orm/core';
import { DatabaseE2ETestingModule } from 'app';

describe('Sync module initializing', () => {
  const testModules = async (imports: ModuleMetadata['imports']) => {
    const moduleRef = await Test.createTestingModule({ imports }).compile();
    const storageService: RegistryStorageService = moduleRef.get(RegistryStorageService);

    const generator = moduleRef.get(MikroORM).getSchemaGenerator();
    await generator.refreshDatabase();
    await generator.clearDatabase();

    expect(storageService).toBeDefined();
    await storageService.onModuleDestroy();
  };

  test('forRoot', async () => {
    await testModules([DatabaseE2ETestingModule.forRoot(), RegistryStorageModule.forRoot({})]);
  });

  test('forFeature', async () => {
    await testModules([DatabaseE2ETestingModule.forRoot(), RegistryStorageModule.forFeature()]);
  });
});
