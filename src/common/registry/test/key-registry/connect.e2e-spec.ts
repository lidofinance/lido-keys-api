import { Test } from '@nestjs/testing';
import { nullTransport, LoggerModule } from '@lido-nestjs/logger';
import { BatchProviderModule, ExtendedJsonRpcBatchProvider } from '@lido-nestjs/execution';
import { KeyRegistryModule, KeyRegistryService, RegistryOperatorFetchService, RegistryStorageService } from '../../';
import { clearDb } from '../testing.utils';
import { MikroORM } from '@mikro-orm/core';
import { REGISTRY_CONTRACT_ADDRESSES } from '@lido-nestjs/contracts';
import * as dotenv from 'dotenv';
import { DatabaseE2ETestingModule } from 'app';
import { PrometheusModule } from 'common/prometheus';

dotenv.config();

describe.skip('Registry', () => {
  let registryService: KeyRegistryService;
  let storageService: RegistryStorageService;
  let registryOperatorFetchService: RegistryOperatorFetchService;
  let mikroOrm: MikroORM;
  if (!process.env.CHAIN_ID) {
    console.error("CHAIN_ID wasn't provides");
    process.exit(1);
  }
  const address = REGISTRY_CONTRACT_ADDRESSES[process.env.CHAIN_ID];

  const blockHash = '0x947aa07f029fd9fed1af664339373077e61f54aff32d692e1f00139fcd4c5039';

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
      KeyRegistryModule.forFeatureAsync({
        inject: [ExtendedJsonRpcBatchProvider],
        async useFactory(provider: ExtendedJsonRpcBatchProvider) {
          return { provider };
        },
      }),
      PrometheusModule,
    ];
    const moduleRef = await Test.createTestingModule({ imports }).compile();
    registryService = moduleRef.get(KeyRegistryService);
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

    // TODO: consider uncommit on holesky
    // await compareTestOperators(address, registryService, {
    //   operators: operatorsWithModuleAddress,
    // });

    const operators = await registryService.getOperatorsFromStorage(address);
    expect(operators.length).toEqual(36);
    const keys = await registryService.getOperatorsKeysFromStorage(address);
    expect(keys.length).toEqual(62381);
  }, 400_000);
});
