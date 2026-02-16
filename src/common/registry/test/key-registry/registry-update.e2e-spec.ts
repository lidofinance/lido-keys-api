import { Global, Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { nullTransport, LoggerModule, MockLoggerModule, LOGGER_PROVIDER } from '@lido-nestjs/logger';
import {
  KeyRegistryModule,
  KeyRegistryService,
  RegistryStorageService,
  RegistryKeyStorageService,
  RegistryOperatorStorageService,
} from 'common/registry';
import { keys, newKey, operators } from '../fixtures/db.fixture';
import { clone, compareTestKeysAndOperators, compareTestKeys, compareTestOperators, clearDb } from '../testing.utils';
import { registryServiceMock } from '../mock-utils';
import { DatabaseE2ETestingModule } from 'app';
import { MikroORM } from '@mikro-orm/core';
import { REGISTRY_CONTRACT_TOKEN } from 'common/contracts';
import { PrometheusModule } from 'common/prometheus';

// blockHash is unused by mocks — any string works
const blockHash = '0x0';

const address = '0x' + 'aa'.repeat(20);

const mockConnectRegistry = jest.fn();

@Global()
@Module({
  providers: [{ provide: REGISTRY_CONTRACT_TOKEN, useValue: mockConnectRegistry }],
  exports: [REGISTRY_CONTRACT_TOKEN],
})
class MockContractsModule {}

describe('Registry update', () => {
  const keysWithModuleAddress = keys.map((key) => {
    return { ...key, moduleAddress: address };
  });

  const operatorsWithModuleAddress = operators.map((operator) => {
    return { ...operator, moduleAddress: address };
  });

  let registryService: KeyRegistryService;
  let registryStorageService: RegistryStorageService;

  let keyStorageService: RegistryKeyStorageService;
  let operatorStorageService: RegistryOperatorStorageService;
  let mikroOrm: MikroORM;

  let moduleRef: TestingModule;

  beforeEach(async () => {
    const imports = [
      MockContractsModule,
      DatabaseE2ETestingModule.forRoot(),
      LoggerModule.forRoot({ transports: [nullTransport()] }),
      KeyRegistryModule.forFeature(),
      PrometheusModule,
    ];

    moduleRef = await Test.createTestingModule({ imports }).compile();
    registryService = moduleRef.get(KeyRegistryService);
    registryStorageService = moduleRef.get(RegistryStorageService);

    keyStorageService = moduleRef.get(RegistryKeyStorageService);
    operatorStorageService = moduleRef.get(RegistryOperatorStorageService);

    mikroOrm = moduleRef.get(MikroORM);
    const generator = moduleRef.get(MikroORM).getSchemaGenerator();
    await generator.refreshDatabase();
    await generator.clearDatabase();

    await keyStorageService.save(keysWithModuleAddress);
    await operatorStorageService.save(operatorsWithModuleAddress);
  });

  afterEach(async () => {
    await clearDb(mikroOrm);
    await registryStorageService.onModuleDestroy();
  });

  test('no update is required when nothing changed', async () => {
    // fixture: finalizedUsedSigningKeys == totalSigningKeys == 3
    // range [3, 3) is empty → saveKeys not called
    const saveOperatorsRegistryMock = jest.spyOn(registryService, 'saveOperators');
    const saveKeyRegistryMock = jest.spyOn(registryService, 'saveKeys');

    registryServiceMock(moduleRef, {
      keys: keysWithModuleAddress,
      operators: operatorsWithModuleAddress,
    });

    await registryService.update(address, blockHash);
    expect(saveOperatorsRegistryMock).toBeCalledTimes(1);
    expect(saveKeyRegistryMock).toBeCalledTimes(0);
    await compareTestKeysAndOperators(address, registryService, {
      keys: keysWithModuleAddress,
      operators: operatorsWithModuleAddress,
    });
  });

  test('new key is added to database if totalSigningKeys is increased', async () => {
    // totalSigningKeys 3→4 for operator 0
    // range [3, 4) → one new key fetched and saved
    const newKeys = clone([...keysWithModuleAddress, { ...newKey, moduleAddress: address, vetted: true }]);

    const newOperators = clone(operatorsWithModuleAddress);
    newOperators[0].totalSigningKeys++;

    const saveKeyRegistryMock = jest.spyOn(registryService, 'saveKeys');

    registryServiceMock(moduleRef, {
      keys: newKeys,
      operators: newOperators,
    });

    await registryService.update(address, blockHash);
    expect(saveKeyRegistryMock.mock.calls.length).toBeGreaterThanOrEqual(1);

    await compareTestKeys(address, registryService, { keys: newKeys });
    await compareTestOperators(address, registryService, {
      operators: newOperators,
    });
  });

  test('remove keys with index higher than totalSigningKeys', async () => {
    // totalSigningKeys 3→2 for operator 0
    // saveOperators() runs nativeDelete({ index: { $gte: 2 } }) → key at index 2 deleted
    const newOperators = clone(operatorsWithModuleAddress);
    newOperators[0].totalSigningKeys--;

    registryServiceMock(moduleRef, {
      keys: keysWithModuleAddress,
      operators: newOperators,
    });

    await registryService.update(address, blockHash);

    await compareTestOperators(address, registryService, {
      operators: newOperators,
    });

    const newOperator0Keys = keysWithModuleAddress
      .filter(({ operatorIndex }) => operatorIndex === 0)
      .sort((a, b) => a.operatorIndex - b.operatorIndex)
      .slice(0, -1);

    const oldOperators1Keys = keysWithModuleAddress
      .filter(({ operatorIndex }) => operatorIndex === 1)
      .sort((a, b) => a.operatorIndex - b.operatorIndex);

    await compareTestKeys(address, registryService, {
      keys: [...newOperator0Keys, ...oldOperators1Keys],
    });

    const keysOfOperator0 = (await registryService.getModuleKeysFromStorage(address)).filter(
      ({ operatorIndex }) => operatorIndex === 0,
    );

    expect(keysOfOperator0.length).toBe(newOperators[0].totalSigningKeys);
  });
});

describe('Reorg detection', () => {
  let registryService: KeyRegistryService;
  let registryStorageService: RegistryStorageService;
  let moduleRef: TestingModule;
  let mikroOrm: MikroORM;

  beforeEach(async () => {
    const imports = [
      MockContractsModule,
      DatabaseE2ETestingModule.forRoot(),
      MockLoggerModule.forRoot({
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
      }),
      KeyRegistryModule.forFeature(),
      PrometheusModule,
    ];
    moduleRef = await Test.createTestingModule({
      imports,
      providers: [{ provide: LOGGER_PROVIDER, useValue: {} }],
    }).compile();
    registryService = moduleRef.get(KeyRegistryService);
    registryStorageService = moduleRef.get(RegistryStorageService);
    mikroOrm = moduleRef.get(MikroORM);
    const generator = mikroOrm.getSchemaGenerator();
    await generator.refreshDatabase();
    await generator.clearDatabase();
  });

  afterEach(async () => {
    await clearDb(mikroOrm);
    await registryStorageService.onModuleDestroy();
  });

  test('keys below finalizedUsedSigningKeys are not overwritten on second update', async () => {
    // 1st update: empty DB → compareOperators(null, op) = false → unchangedKeysMaxIndex = 0
    // all keys [0, 3) fetched for each operator
    const saveKeyRegistryMock = jest.spyOn(registryService, 'saveKeys');
    const finalizedUsedSigningKeys = 1;

    const keysWithModuleAddress = keys.map((key) => {
      return { ...key, moduleAddress: address };
    });

    const operatorsWithModuleAddress = operators.map((key) => {
      return { ...key, moduleAddress: address, finalizedUsedSigningKeys };
    });

    const unrefMock = registryServiceMock(moduleRef, {
      keys: keysWithModuleAddress,
      operators: operatorsWithModuleAddress,
    });

    await registryService.update(address, blockHash);

    expect(saveKeyRegistryMock.mock.calls.length).toEqual(operatorsWithModuleAddress.length);

    await compareTestKeysAndOperators(address, registryService, {
      keys: keysWithModuleAddress,
      operators: operatorsWithModuleAddress,
    });

    unrefMock();

    // 2nd update: mock returns corrupted keys for index < finalizedUsedSigningKeys
    // but update() uses range [finalizedUsedSigningKeys, totalSigningKeys) = [1, 3)
    // so keys at index 0 are NOT re-fetched → DB retains correct data
    const keysWithSpoiledLeftEdge = clone(keysWithModuleAddress).map((key) =>
      key.index >= finalizedUsedSigningKeys ? { ...key } : { ...key, key: '', depositSignature: '' },
    );

    registryServiceMock(moduleRef, {
      keys: keysWithSpoiledLeftEdge,
      operators: operatorsWithModuleAddress,
    });

    await registryService.update(address, blockHash);

    await compareTestKeysAndOperators(address, registryService, {
      keys: keysWithModuleAddress,
      operators: operatorsWithModuleAddress,
    });
  });
});
