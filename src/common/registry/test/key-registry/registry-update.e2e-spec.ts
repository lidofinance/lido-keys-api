import { Test, TestingModule } from '@nestjs/testing';
import { nullTransport, LoggerModule, MockLoggerModule, LOGGER_PROVIDER } from '@catalist-nestjs/logger';
import { getNetwork } from '@ethersproject/networks';
import { JsonRpcBatchProvider } from '@ethersproject/providers';
import {
  KeyRegistryModule,
  KeyRegistryService,
  RegistryStorageService,
  RegistryKeyStorageService,
  RegistryOperatorStorageService,
} from '../..';
import { keys, newKey, newOperator, operators, operatorWithDefaultsRecords } from '../fixtures/db.fixture';
import { clone, compareTestKeysAndOperators, compareTestKeys, compareTestOperators, clearDb } from '../testing.utils';
import { registryServiceMock } from '../mock-utils';
import { DatabaseE2ETestingModule } from 'app';
import { MikroORM } from '@mikro-orm/core';
import { REGISTRY_CONTRACT_ADDRESSES } from '@catalist-nestjs/contracts';
import * as dotenv from 'dotenv';

dotenv.config();

const blockHash = '0x4ef0f15a8a04a97f60a9f76ba83d27bcf98dac9635685cd05fe1d78bd6e93418';

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
  let mikroOrm: MikroORM;

  let moduleRef: TestingModule;

  const mockCall = jest.spyOn(provider, 'call').mockImplementation(async () => '');

  jest.spyOn(provider, 'detectNetwork').mockImplementation(async () => getNetwork('mainnet'));

  beforeEach(async () => {
    const imports = [
      DatabaseE2ETestingModule.forRoot(),
      LoggerModule.forRoot({ transports: [nullTransport()] }),
      KeyRegistryModule.forFeature({ provider }),
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
    mockCall.mockReset();
    await clearDb(mikroOrm);
    await registryStorageService.onModuleDestroy();
  });

  describe('update', () => {
    test('no update is required', async () => {
      const saveOperatorsRegistryMock = jest.spyOn(registryService, 'saveOperators');
      const saveKeyRegistryMock = jest.spyOn(registryService, 'saveKeys');

      registryServiceMock(moduleRef, provider, {
        keys: keysWithModuleAddress,
        operators: operatorsWithModuleAddress,
      });

      await registryService.update(address, blockHash);
      expect(saveOperatorsRegistryMock).toBeCalledTimes(1);
      // 2 - number of operators
      expect(saveKeyRegistryMock).toBeCalledTimes(2);
      await compareTestKeysAndOperators(address, registryService, {
        keys: keysWithModuleAddress,
        operators: operatorsWithModuleAddress,
      });
    });

    test('used keys are immutable', async () => {
      // this test is based on usedSigningKeys = 3 value of operator with index 0
      // so keys will be updated from usedSigningKeys to totalSigningKeys
      const newKeys = clone(keysWithModuleAddress);
      newKeys[0].used = false;

      const saveOperatorsRegistryMock = jest.spyOn(registryService, 'saveOperators');
      const saveKeyRegistryMock = jest.spyOn(registryService, 'saveKeys');

      registryServiceMock(moduleRef, provider, {
        keys: newKeys,
        operators: operatorsWithModuleAddress,
      });

      await registryService.update(address, blockHash);
      expect(saveOperatorsRegistryMock).toBeCalledTimes(1);
      expect(saveKeyRegistryMock.mock.calls.length).toBeGreaterThanOrEqual(1);
      await compareTestKeys(address, registryService, { keys: keysWithModuleAddress });
      await compareTestOperators(address, registryService, { operators: operatorsWithModuleAddress });
    });

    test('new key is added to database if totalSigningKeys is increased', async () => {
      const newKeys = clone([...keysWithModuleAddress, { ...newKey, moduleAddress: address }]);

      const newOperators = clone(operatorsWithModuleAddress);
      newOperators[0].totalSigningKeys++;

      const saveOperatorsRegistryMock = jest.spyOn(registryService, 'saveOperators');
      const saveKeyRegistryMock = jest.spyOn(registryService, 'saveKeys');

      registryServiceMock(moduleRef, provider, {
        keys: newKeys,
        operators: newOperators,
      });

      await registryService.update(address, blockHash);
      expect(saveOperatorsRegistryMock).toBeCalledTimes(1);
      expect(saveKeyRegistryMock.mock.calls.length).toBeGreaterThanOrEqual(1);

      await compareTestKeys(address, registryService, { keys: newKeys });
      await compareTestOperators(address, registryService, {
        operators: newOperators,
      });
    });

    test('add new operator', async () => {
      // operators is always updated during run of update function
      const newOperators = clone([...operatorsWithModuleAddress, { ...newOperator, moduleAddress: address }]);

      const saveOperatorRegistryMock = jest.spyOn(registryService, 'saveOperators');
      const saveKeyRegistryMock = jest.spyOn(registryService, 'saveKeys');

      registryServiceMock(moduleRef, provider, {
        keys: keysWithModuleAddress,
        operators: newOperators,
      });

      await registryService.update(address, blockHash);
      expect(saveOperatorRegistryMock).toBeCalledTimes(1);
      expect(saveKeyRegistryMock.mock.calls.length).toBeGreaterThanOrEqual(1);

      await compareTestKeys(address, registryService, { keys: keysWithModuleAddress });
      await compareTestOperators(address, registryService, {
        operators: newOperators,
      });
    });

    test('add operator with default records', async () => {
      const newOperators = clone([
        ...operatorsWithModuleAddress,
        { ...operatorWithDefaultsRecords, moduleAddress: address },
      ]);

      const saveOperatorsRegistryMock = jest.spyOn(registryService, 'saveOperators');
      const saveKeyRegistryMock = jest.spyOn(registryService, 'saveKeys');

      registryServiceMock(moduleRef, provider, {
        keys: keysWithModuleAddress,
        operators: newOperators,
      });

      await registryService.update(address, blockHash);
      expect(saveOperatorsRegistryMock).toBeCalledTimes(1);
      expect(saveKeyRegistryMock.mock.calls.length).toBeGreaterThanOrEqual(1);
      await compareTestKeys(address, registryService, { keys: keysWithModuleAddress });
      await compareTestOperators(address, registryService, {
        operators: newOperators,
      });
    });

    test('decrease of usedSigningKeys will not result in the removal of a key', async () => {
      // keys will be updated in range form = usedSigningKeys to=totalSigningKeys
      const newOperators = clone(operatorsWithModuleAddress);
      newOperators[0].usedSigningKeys--;

      const saveOperatorsRegistryMock = jest.spyOn(registryService, 'saveOperators');
      const saveKeyRegistryMock = jest.spyOn(registryService, 'saveKeys');

      registryServiceMock(moduleRef, provider, {
        keys: keysWithModuleAddress,
        operators: newOperators,
      });

      await registryService.update(address, blockHash);
      expect(saveOperatorsRegistryMock).toBeCalledTimes(1);
      expect(saveKeyRegistryMock.mock.calls.length).toBeGreaterThanOrEqual(1);
      await compareTestKeys(address, registryService, { keys: keysWithModuleAddress });
      await compareTestOperators(address, registryService, {
        operators: newOperators,
      });
    });

    test('remove keys with index higher than totalSigningKeys', async () => {
      // during update we remove all keys from the database that are greater than the total number of keys
      const newOperators = clone(operatorsWithModuleAddress);
      newOperators[0].totalSigningKeys--;

      const saveOperatorsRegistryMock = jest.spyOn(registryService, 'saveOperators');
      const saveKeyRegistryMock = jest.spyOn(registryService, 'saveKeys');
      registryServiceMock(moduleRef, provider, {
        keys: keysWithModuleAddress,
        operators: newOperators,
      });

      await registryService.update(address, blockHash);
      expect(saveOperatorsRegistryMock).toBeCalledTimes(1);
      expect(saveKeyRegistryMock.mock.calls.length).toBeGreaterThanOrEqual(1);

      await compareTestOperators(address, registryService, {
        operators: newOperators,
      });

      const newOperator0Keys = keysWithModuleAddress
        .filter(({ operatorIndex }) => operatorIndex === 0)
        .sort((a, b) => a.operatorIndex - b.operatorIndex)
        .slice(0, -1);

      await compareTestKeys(address, registryService, {
        keys: newOperator0Keys,
      });

      const keysOfOperator0 = await (
        await registryService.getModuleKeysFromStorage(address)
      ).filter(({ operatorIndex }) => operatorIndex === 0);

      expect(keysOfOperator0.length).toBe(newOperators[0].totalSigningKeys);
    });

    test('during update previous operator usedSigningKeys value is being used', async () => {
      const newOperators = clone(operatorsWithModuleAddress);
      newOperators[0].usedSigningKeys++;

      const saveOperatorsRegistryMock = jest.spyOn(registryService, 'saveOperators');
      const saveKeyRegistryMock = jest.spyOn(registryService, 'saveKeys');

      const newKeys = clone([
        ...keysWithModuleAddress,
        {
          operatorIndex: 0,
          index: 3,
          key: '0xa544bc44d8eacbf4dd6a2d6087b43f4c67fd5618651b97effcb30997bf49e5d7acf0100ef14e5d087cc228bc78d498e6',
          depositSignature:
            '0x967875a0104d1f674538e2ec0df4be0a61ef08061cdcfa83e5a63a43dadb772d29053368224e5d8e046ba1a78490f5fc0f0186f23af0465d0a82b2db2e7535782fe12e1fd1cd4f6eb77d8dc7a4f7ab0fde31435d5fa98a013e0a716c5e1ef6a2',
          used: true,
          moduleAddress: address,
        },
      ]);

      registryServiceMock(moduleRef, provider, {
        keys: newKeys,
        operators: newOperators,
      });

      await registryService.update(address, blockHash);
      expect(saveOperatorsRegistryMock).toBeCalledTimes(1);
      expect(saveKeyRegistryMock.mock.calls.length).toBeGreaterThanOrEqual(1);
      await compareTestKeys(address, registryService, { keys: keysWithModuleAddress });
      await compareTestOperators(address, registryService, {
        operators: newOperators,
      });
    });
  });
});

describe('Reorg detection', () => {
  const provider = new JsonRpcBatchProvider(process.env.PROVIDERS_URLS);
  let registryService: KeyRegistryService;
  let registryStorageService: RegistryStorageService;
  let moduleRef: TestingModule;
  const mockCall = jest.spyOn(provider, 'call').mockImplementation(async () => '');
  const CHAIN_ID = process.env.CHAIN_ID || 1;
  const address = REGISTRY_CONTRACT_ADDRESSES[CHAIN_ID];
  let mikroOrm: MikroORM;

  jest.spyOn(provider, 'detectNetwork').mockImplementation(async () => getNetwork('mainnet'));

  beforeEach(async () => {
    const imports = [
      DatabaseE2ETestingModule.forRoot(),
      MockLoggerModule.forRoot({
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
      }),
      KeyRegistryModule.forFeature({ provider }),
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
    mockCall.mockReset();
    await clearDb(mikroOrm);
    await registryStorageService.onModuleDestroy();
  });

  test('init on update', async () => {
    const saveRegistryMock = jest.spyOn(registryService, 'saveOperators');
    const saveKeyRegistryMock = jest.spyOn(registryService, 'saveKeys');
    const finalizedUsedSigningKeys = 1;

    const keysWithModuleAddress = keys.map((key) => {
      return { ...key, moduleAddress: address };
    });

    const operatorsWithModuleAddress = operators.map((key) => {
      return { ...key, moduleAddress: address, finalizedUsedSigningKeys };
    });

    const unrefMock = registryServiceMock(moduleRef, provider, {
      keys: keysWithModuleAddress,
      operators: operatorsWithModuleAddress,
    });

    await registryService.update(address, blockHash);

    expect(saveRegistryMock).toBeCalledTimes(1);
    expect(saveKeyRegistryMock.mock.calls.length).toBeGreaterThanOrEqual(2);

    await compareTestKeysAndOperators(address, registryService, {
      keys: keysWithModuleAddress,
      operators: operatorsWithModuleAddress,
    });

    unrefMock();

    // Let's corrupt the data below to make sure that
    // the update method handles the left boundary correctly
    const keysWithSpoiledLeftEdge = clone(keysWithModuleAddress).map((key) =>
      key.index >= finalizedUsedSigningKeys ? { ...key } : { ...key, key: '', depositSignature: '' },
    );

    registryServiceMock(moduleRef, provider, {
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
