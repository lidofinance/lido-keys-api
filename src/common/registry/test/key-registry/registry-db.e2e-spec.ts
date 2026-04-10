import { Global, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { nullTransport, LoggerModule } from '@lido-nestjs/logger';
import {
  KeyRegistryModule,
  KeyRegistryService,
  RegistryStorageService,
  RegistryKeyStorageService,
  RegistryOperatorStorageService,
} from '../..';
import { keys, operators } from '../fixtures/db.fixture';
import { clearDb, compareTestKeysAndOperators } from '../testing.utils';
import { MikroORM } from '@mikro-orm/core';
import { DatabaseE2ETestingModule } from 'app';
import { REGISTRY_CONTRACT_TOKEN } from 'common/contracts';
import { CSM_CONTRACT_TOKEN } from 'common/contracts';
import { CSMKeyRegistryModule } from 'common/registry-csm';
import { PrometheusModule } from 'common/prometheus';

const address = '0x' + 'aa'.repeat(20);

const mockConnectRegistry = jest.fn();
const mockConnectCsm = jest.fn();

@Global()
@Module({
  providers: [
    { provide: REGISTRY_CONTRACT_TOKEN, useValue: mockConnectRegistry },
    { provide: CSM_CONTRACT_TOKEN, useValue: mockConnectCsm },
  ],
  exports: [REGISTRY_CONTRACT_TOKEN, CSM_CONTRACT_TOKEN],
})
class MockContractsModule {}

describe('Registry', () => {
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
  let mikroOrm: MikroORM;

  beforeEach(async () => {
    const imports = [
      MockContractsModule,
      DatabaseE2ETestingModule.forRoot(),
      LoggerModule.forRoot({ transports: [nullTransport()] }),
      KeyRegistryModule.forFeature(),
      CSMKeyRegistryModule.forFeature(),
      PrometheusModule,
    ];
    const moduleRef = await Test.createTestingModule({ imports }).compile();
    registryService = moduleRef.get(KeyRegistryService);
    registryStorageService = moduleRef.get(RegistryStorageService);

    keyStorageService = moduleRef.get(RegistryKeyStorageService);
    operatorStorageService = moduleRef.get(RegistryOperatorStorageService);

    mikroOrm = moduleRef.get(MikroORM);
    const generator = mikroOrm.getSchemaGenerator();
    await generator.refreshDatabase();
    await generator.clearDatabase();

    await keyStorageService.save(keysWithModuleAddress);
    await operatorStorageService.save(operatorsWithModuleAddress);
  });

  afterEach(async () => {
    await clearDb(mikroOrm);
    await registryStorageService.onModuleDestroy();
  });

  test('db init is correct', async () => {
    await compareTestKeysAndOperators(address, registryService, {
      keys: keysWithModuleAddress,
      operators: operatorsWithModuleAddress,
    });
  });
});
