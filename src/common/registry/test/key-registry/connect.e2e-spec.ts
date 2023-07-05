import { Test } from '@nestjs/testing';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { nullTransport, LoggerModule } from '@lido-nestjs/logger';
import { BatchProviderModule, ExtendedJsonRpcBatchProvider } from '@lido-nestjs/execution';

import { KeyRegistryModule, KeyRegistryService, RegistryStorageService } from '../../';

import { compareTestMetaData, compareTestMetaOperators } from '../testing.utils';

import { meta, operators } from '../fixtures/connect.fixture';
import { MikroORM } from '@mikro-orm/core';

describe('Registry', () => {
  let registryService: KeyRegistryService;
  let storageService: RegistryStorageService;

  beforeEach(async () => {
    const imports = [
      MikroOrmModule.forRoot({
        dbName: ':memory:',
        type: 'sqlite',
        allowGlobalContext: true,
        entities: ['../**/*.entity.ts'],
      }),
      BatchProviderModule.forRoot({
        url: process.env.EL_RPC_URL as string,
        requestPolicy: {
          jsonRpcMaxBatchSize: 50,
          maxConcurrentRequests: 10,
          batchAggregationWaitMs: 10,
        },
      }),
      LoggerModule.forRoot({ transports: [nullTransport()] }),
      KeyRegistryModule.forFeatureAsync({
        inject: [ExtendedJsonRpcBatchProvider],
        async useFactory(provider: ExtendedJsonRpcBatchProvider) {
          return { provider };
        },
      }),
    ];
    const moduleRef = await Test.createTestingModule({ imports }).compile();
    registryService = moduleRef.get(KeyRegistryService);
    storageService = moduleRef.get(RegistryStorageService);

    const generator = moduleRef.get(MikroORM).getSchemaGenerator();
    await generator.updateSchema();
  });

  afterEach(async () => {
    await registryService.clear();
    await storageService.onModuleDestroy();
  });

  test('Update', async () => {
    await registryService.update(6912872);

    await compareTestMetaData(registryService, { meta: meta });

    await compareTestMetaOperators(registryService, {
      operators: operators,
    });

    const keys = await registryService.getOperatorsKeysFromStorage();
    expect(keys).toHaveLength(1036);
  }, 200_000);
});
