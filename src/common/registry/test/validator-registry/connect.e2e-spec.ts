import { Test } from '@nestjs/testing';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { nullTransport, LoggerModule } from '@lido-nestjs/logger';
import { BatchProviderModule, ExtendedJsonRpcBatchProvider } from '@lido-nestjs/execution';

import { ValidatorRegistryModule, ValidatorRegistryService, RegistryStorageService } from '../../';

import { compareTestMetaOperators } from '../testing.utils';

import { operators } from '../fixtures/connect.fixture';
import { MikroORM } from '@mikro-orm/core';
import { REGISTRY_CONTRACT_ADDRESSES } from '@lido-nestjs/contracts';

describe('Registry', () => {
  let registryService: ValidatorRegistryService;
  let storageService: RegistryStorageService;
  if (!process.env.CHAIN_ID) {
    console.error("CHAIN_ID wasn't provides");
    process.exit(1);
  }
  const address = REGISTRY_CONTRACT_ADDRESSES[process.env.CHAIN_ID];

  const operatorsWithModuleAddress = operators.map((key) => {
    return { ...key, moduleAddress: address };
  });

  beforeEach(async () => {
    const imports = [
      MikroOrmModule.forRoot({
        dbName: ':memory:',
        type: 'sqlite',
        allowGlobalContext: true,
        entities: ['./**/*.entity.ts'],
      }),
      BatchProviderModule.forRoot({
        url: process.env.PROVIDERS_URLS as string,
        requestPolicy: {
          jsonRpcMaxBatchSize: 50,
          maxConcurrentRequests: 10,
          batchAggregationWaitMs: 10,
        },
      }),
      LoggerModule.forRoot({ transports: [nullTransport()] }),
      ValidatorRegistryModule.forFeatureAsync({
        inject: [ExtendedJsonRpcBatchProvider],
        async useFactory(provider: ExtendedJsonRpcBatchProvider) {
          return { provider };
        },
      }),
    ];
    const moduleRef = await Test.createTestingModule({ imports }).compile();
    registryService = moduleRef.get(ValidatorRegistryService);
    storageService = moduleRef.get(RegistryStorageService);

    const generator = moduleRef.get(MikroORM).getSchemaGenerator();
    await generator.updateSchema();
  });

  afterEach(async () => {
    await registryService.clear();

    await storageService.onModuleDestroy();
  });

  test('Update', async () => {
    const hash = '0xb8adbea6395dbae8f81e7bfc4f731833b9c2a4a10fd9a42d0c059aeb9236dc37';
    // 6912872
    await registryService.update(address, hash);

    await compareTestMetaOperators(address, registryService, {
      operators: operatorsWithModuleAddress,
    });

    const keys = await registryService.getOperatorsKeysFromStorage(address);
    expect(keys).toHaveLength(250);
  }, 200_000);
});
