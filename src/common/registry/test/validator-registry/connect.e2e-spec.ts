import { Test } from '@nestjs/testing';
import { nullTransport, LoggerModule } from '@catalist-nestjs/logger';
import { BatchProviderModule, ExtendedJsonRpcBatchProvider } from '@catalist-nestjs/execution';
import { DatabaseE2ETestingModule } from 'app';

import {
  ValidatorRegistryModule,
  ValidatorRegistryService,
  RegistryStorageService,
  RegistryOperatorFetchService,
} from '../../';

import { clearDb } from '../testing.utils';
import { MikroORM } from '@mikro-orm/core';
import { REGISTRY_CONTRACT_ADDRESSES } from '@catalist-nestjs/contracts';
import * as dotenv from 'dotenv';

dotenv.config();

describe('Registry', () => {
  let registryService: ValidatorRegistryService;
  let registryOperatorFetchService: RegistryOperatorFetchService;
  let mikroOrm: MikroORM;

  let storageService: RegistryStorageService;
  if (!process.env.CHAIN_ID) {
    console.error("CHAIN_ID wasn't provides");
    process.exit(1);
  }
  const address = REGISTRY_CONTRACT_ADDRESSES[process.env.CHAIN_ID];

  // const operatorsWithModuleAddress = operators.map((key) => {
  //   return { ...key, moduleAddress: address };
  // });

  const blockHash = '0x42e6d3fe6df4bc4bdfda27595a015ac9fd5af65cf9bd9d8ad0f2ac802dd73749';

  beforeEach(async () => {
    const imports = [
      DatabaseE2ETestingModule.forRoot(),
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
    registryOperatorFetchService = moduleRef.get(RegistryOperatorFetchService);
    mikroOrm = moduleRef.get(MikroORM);

    jest.spyOn(registryOperatorFetchService, 'getFinalizedBlockTag').mockImplementation(() => ({ blockHash } as any));

    const generator = mikroOrm.getSchemaGenerator();
    await generator.refreshDatabase();
    await generator.clearDatabase();
  });

  afterEach(async () => {
    await clearDb(mikroOrm);

    await storageService.onModuleDestroy();
  });

  test('Update', async () => {
    await registryService.update(address, blockHash);

    // await compareTestOperators(address, registryService, {
    //   operators: operatorsWithModuleAddress,
    // });

    const operators = await registryService.getOperatorsFromStorage(address);
    expect(operators).toHaveLength(89);
    const keys = await registryService.getOperatorsKeysFromStorage(address);
    expect(keys).toHaveLength(55131);
  }, 400_000);
});
