import { Test } from '@nestjs/testing';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { nullTransport, LoggerModule } from '@lido-nestjs/logger';
import { getNetwork } from '@ethersproject/networks';
import { JsonRpcBatchProvider } from '@ethersproject/providers';
import {
  KeyRegistryModule,
  KeyRegistryService,
  RegistryStorageService,
  RegistryKeyStorageService,
  RegistryOperatorStorageService,
} from '../../';
import { keys, operators } from '../fixtures/db.fixture';
import { compareTestMeta } from '../testing.utils';
import { MikroORM } from '@mikro-orm/core';
import { REGISTRY_CONTRACT_ADDRESSES } from '@lido-nestjs/contracts';

describe('Registry', () => {
  const provider = new JsonRpcBatchProvider(process.env.PROVIDERS_URLS);
  const CHAIN_ID = process.env.CHAIN_ID || 1;
  const address = REGISTRY_CONTRACT_ADDRESSES[CHAIN_ID];

  const keysWithModuleAddress = keys.map((key) => {
    return { ...key, moduleAddress: address };
  });

  const operatorsWithModuleAddress = operators.map((key) => {
    return { ...key, moduleAddress: address };
  });

  let registryService: KeyRegistryService;
  let registryStorageService: RegistryStorageService;

  let keyStorageService: RegistryKeyStorageService;
  let operatorStorageService: RegistryOperatorStorageService;

  const mockCall = jest.spyOn(provider, 'call').mockImplementation(async () => '');

  // TODO: why we fix here mainnet
  jest.spyOn(provider, 'detectNetwork').mockImplementation(async () => getNetwork('mainnet'));

  beforeEach(async () => {
    const imports = [
      MikroOrmModule.forRoot({
        dbName: ':memory:',
        type: 'sqlite',
        allowGlobalContext: true,
        entities: ['./**/*.entity.ts'],
      }),
      LoggerModule.forRoot({ transports: [nullTransport()] }),
      KeyRegistryModule.forFeature({ provider }),
    ];
    const moduleRef = await Test.createTestingModule({ imports }).compile();
    registryService = moduleRef.get(KeyRegistryService);
    registryStorageService = moduleRef.get(RegistryStorageService);

    keyStorageService = moduleRef.get(RegistryKeyStorageService);
    operatorStorageService = moduleRef.get(RegistryOperatorStorageService);

    const generator = moduleRef.get(MikroORM).getSchemaGenerator();
    await generator.updateSchema();

    // TODO: should we change name of this test from spec -> e2e-spec

    await keyStorageService.save(keysWithModuleAddress);

    await operatorStorageService.save(operatorsWithModuleAddress);
  });

  afterEach(async () => {
    mockCall.mockReset();
    await registryService.clear();
    await registryStorageService.onModuleDestroy();
  });

  test('db init is correct', async () => {
    await compareTestMeta(address, registryService, {
      keys: keysWithModuleAddress,
      operators: operatorsWithModuleAddress,
    });
  });
});
