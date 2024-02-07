import { DynamicModule, Injectable, Module } from '@nestjs/common';
import { ModuleMetadata } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { RegistryStorageModule, RegistryStorageService } from '../..';
import { MikroORM } from '@mikro-orm/core';
import { DatabaseE2ETestingModule } from 'app';

@Injectable()
class TestService {}
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
    const storageService: RegistryStorageService = moduleRef.get(RegistryStorageService);

    const generator = moduleRef.get(MikroORM).getSchemaGenerator();
    await generator.refreshDatabase();
    await generator.clearDatabase();

    expect(storageService).toBeDefined();
    await storageService.onModuleDestroy();
  };

  test('forRootAsync', async () => {
    await testModules([
      TestModule.forRoot(),
      DatabaseE2ETestingModule.forRoot(),
      RegistryStorageModule.forRootAsync({
        async useFactory() {
          return {};
        },
        inject: [TestService],
      }),
    ]);
  });

  test('forFeatureAsync', async () => {
    await testModules([
      TestModule.forRoot(),
      DatabaseE2ETestingModule.forRoot(),
      RegistryStorageModule.forFeatureAsync({
        async useFactory() {
          return {};
        },
        inject: [TestService],
      }),
    ]);
  });
});
