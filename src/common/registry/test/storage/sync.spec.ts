import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ModuleMetadata } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { RegistryStorageModule, RegistryStorageService } from '../../';
import { MikroORM } from '@mikro-orm/core';
import { mikroORMConfig } from '../testing.utils';

describe('Sync module initializing', () => {
  const testModules = async (imports: ModuleMetadata['imports']) => {
    const moduleRef = await Test.createTestingModule({ imports }).compile();
    const storageService: RegistryStorageService = moduleRef.get(RegistryStorageService);

    const generator = moduleRef.get(MikroORM).getSchemaGenerator();
    await generator.updateSchema();

    expect(storageService).toBeDefined();
    await storageService.onModuleDestroy();
  };

  test('forRoot', async () => {
    await testModules([MikroOrmModule.forRoot(mikroORMConfig), RegistryStorageModule.forRoot({})]);
  });

  test('forFeature', async () => {
    await testModules([MikroOrmModule.forRoot(mikroORMConfig), RegistryStorageModule.forFeature()]);
  });
});
