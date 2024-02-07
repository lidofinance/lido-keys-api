import { Test, TestingModule } from '@nestjs/testing';
import { nullTransport, LoggerModule, LOGGER_PROVIDER, MockLoggerModule } from '@lido-nestjs/logger';
import { getNetwork } from '@ethersproject/networks';
import { JsonRpcBatchProvider } from '@ethersproject/providers';
import {
  ValidatorRegistryModule,
  ValidatorRegistryService,
  RegistryStorageService,
  RegistryKeyStorageService,
  RegistryOperatorStorageService,
} from '../..';
import { keys, newKey, newOperator, operators, operatorWithDefaultsRecords } from '../fixtures/db.fixture';
import { clone, compareTestKeysAndOperators, compareTestKeys, compareTestOperators, clearDb } from '../testing.utils';
import { registryServiceMock } from '../mock-utils';
import { MikroORM } from '@mikro-orm/core';
import { REGISTRY_CONTRACT_ADDRESSES } from '@lido-nestjs/contracts';
import { DatabaseE2ETestingModule } from 'app';

const blockHash = '0x4ef0f15a8a04a97f60a9f76ba83d27bcf98dac9635685cd05fe1d78bd6e93418';

describe('Validator registry', () => {
  const provider = new JsonRpcBatchProvider(process.env.PROVIDERS_URLS);
  const CHAIN_ID = process.env.CHAIN_ID || 1;
  const address = REGISTRY_CONTRACT_ADDRESSES[CHAIN_ID];

  const keysWithModuleAddress = keys.map((key) => {
    return { ...key, moduleAddress: address };
  });

  const operatorsWithModuleAddress = operators.map((key) => {
    return { ...key, moduleAddress: address };
  });

  let registryService: ValidatorRegistryService;
  let registryStorageService: RegistryStorageService;

  let keyStorageService: RegistryKeyStorageService;
  let operatorStorageService: RegistryOperatorStorageService;
  let mikroOrm: MikroORM;

  let moduleRef: TestingModule;

  const mockCall = jest.spyOn(provider, 'call').mockImplementation(async () => '');

  jest.spyOn(provider, 'detectNetwork').mockImplementation(async () => getNetwork('mainnet'));

  beforeEach(async () => {
    const imports = [
      DatabaseE2ETestingModule,
      LoggerModule.forRoot({ transports: [nullTransport()] }),
      ValidatorRegistryModule.forFeature({ provider }),
    ];

    moduleRef = await Test.createTestingModule({ imports }).compile();

    registryService = moduleRef.get(ValidatorRegistryService);
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
    mockCall.mockReset();
    await clearDb(mikroOrm);
    await registryStorageService.onModuleDestroy();
  });

  describe('update', () => {
    test('no update is required', async () => {
      const saveOperatorRegistryMock = jest.spyOn(registryService, 'saveOperators');
      const saveKeyRegistryMock = jest.spyOn(registryService, 'saveKeys');

      registryServiceMock(moduleRef, provider, {
        keys: keysWithModuleAddress,
        operators: operatorsWithModuleAddress,
      });

      await registryService.update(address, blockHash);
      // update function doesn't make a decision about update no more
      // so here would happen update if list of keys was changed
      expect(saveOperatorRegistryMock).toBeCalledTimes(1);
      // 2 - number of operators
      expect(saveKeyRegistryMock).toBeCalledTimes(2);
      await compareTestKeysAndOperators(address, registryService, {
        keys: keysWithModuleAddress,
        operators: operatorsWithModuleAddress,
      });
    });

    test('new key without keysOpIndex updating', async () => {
      const saveRegistryMock = jest.spyOn(registryService, 'saveOperators');
      const saveKeyRegistryMock = jest.spyOn(registryService, 'saveKeys');

      registryServiceMock(moduleRef, provider, {
        keys: [...keysWithModuleAddress, { ...newKey, moduleAddress: address }],
        operators: operatorsWithModuleAddress,
      });

      await registryService.update(address, blockHash);
      expect(saveRegistryMock).toBeCalledTimes(1);
      expect(saveKeyRegistryMock).toBeCalledTimes(2);
    });

    test('used keys are immutable', async () => {
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

    test('looking only for used keys', async () => {
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
      await compareTestKeys(address, registryService, { keys: keysWithModuleAddress });
      await compareTestOperators(address, registryService, {
        operators: newOperators,
      });
    });

    test('add new operator', async () => {
      const newOperators = clone([...operatorsWithModuleAddress, { ...newOperator, moduleAddress: address }]);
      const saveRegistryMock = jest.spyOn(registryService, 'saveOperators');
      const saveKeyRegistryMock = jest.spyOn(registryService, 'saveKeys');

      registryServiceMock(moduleRef, provider, {
        keys: keysWithModuleAddress,
        operators: newOperators,
      });

      await registryService.update(address, blockHash);
      expect(saveRegistryMock).toBeCalledTimes(1);
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

    // /**
    //  *  This case actual only for goerli net
    //  *  In some cases, we remove keys in the test network
    //  */
    test('delete keys from operator', async () => {
      const newOperators = clone(operatorsWithModuleAddress);
      newOperators[0].usedSigningKeys--;

      const saveRegistryMock = jest.spyOn(registryService, 'saveOperators');
      const saveKeyRegistryMock = jest.spyOn(registryService, 'saveKeys');

      registryServiceMock(moduleRef, provider, {
        keys: keysWithModuleAddress,
        operators: newOperators,
      });

      await registryService.update(address, blockHash);
      expect(saveRegistryMock).toBeCalledTimes(1);
      expect(saveKeyRegistryMock.mock.calls.length).toBeGreaterThanOrEqual(1);
      await compareTestKeys(address, registryService, { keys: keysWithModuleAddress });
      await compareTestOperators(address, registryService, {
        operators: newOperators,
      });
    });

    test('remove keys with index higher than totalSigningKeys', async () => {
      const newOperators = clone(operatorsWithModuleAddress);
      newOperators[0].totalSigningKeys--;
      const saveOperatorRegistryMock = jest.spyOn(registryService, 'saveOperators');
      const saveKeyRegistryMock = jest.spyOn(registryService, 'saveKeys');

      registryServiceMock(moduleRef, provider, {
        keys: keysWithModuleAddress,
        operators: newOperators,
      });

      await registryService.update(address, blockHash);
      expect(saveOperatorRegistryMock).toBeCalledTimes(1);
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
        await registryService.getOperatorsKeysFromStorage(address)
      ).filter(({ operatorIndex }) => operatorIndex === 0);

      expect(keysOfOperator0.length).toBe(newOperators[0].totalSigningKeys);
    });
  });
});

describe('Empty registry', () => {
  const provider = new JsonRpcBatchProvider(process.env.PROVIDERS_URLS);
  let registryService: ValidatorRegistryService;
  let registryStorageService: RegistryStorageService;
  let moduleRef: TestingModule;
  const mockCall = jest.spyOn(provider, 'call').mockImplementation(async () => '');
  const CHAIN_ID = process.env.CHAIN_ID || 1;
  const address = REGISTRY_CONTRACT_ADDRESSES[CHAIN_ID];
  let mikroOrm: MikroORM;

  const keysWithModuleAddress = keys.map((key) => {
    return { ...key, moduleAddress: address };
  });

  const operatorsWithModuleAddress = operators.map((key) => {
    return { ...key, moduleAddress: address };
  });

  jest.spyOn(provider, 'detectNetwork').mockImplementation(async () => getNetwork('mainnet'));

  beforeEach(async () => {
    const imports = [
      DatabaseE2ETestingModule,
      MockLoggerModule.forRoot({
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
      }),
      ValidatorRegistryModule.forFeature({ provider }),
    ];
    moduleRef = await Test.createTestingModule({
      imports,
      providers: [{ provide: LOGGER_PROVIDER, useValue: {} }],
    }).compile();
    registryService = moduleRef.get(ValidatorRegistryService);
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
    registryServiceMock(moduleRef, provider, {
      keys: keysWithModuleAddress,
      operators: operatorsWithModuleAddress,
    });

    await registryService.update(address, blockHash);
    expect(saveRegistryMock).toBeCalledTimes(1);
    expect(saveKeyRegistryMock.mock.calls.length).toBeGreaterThanOrEqual(1);
    await compareTestKeysAndOperators(address, registryService, {
      keys: keysWithModuleAddress,
      operators: operatorsWithModuleAddress,
    });
    await registryService.update(address, blockHash);
  });
});

describe('Reorg detection', () => {
  const provider = new JsonRpcBatchProvider(process.env.PROVIDERS_URLS);
  let registryService: ValidatorRegistryService;
  let registryStorageService: RegistryStorageService;
  let moduleRef: TestingModule;
  const mockCall = jest.spyOn(provider, 'call').mockImplementation(async () => '');
  const CHAIN_ID = process.env.CHAIN_ID || 1;
  const address = REGISTRY_CONTRACT_ADDRESSES[CHAIN_ID];
  let mikroOrm: MikroORM;

  jest.spyOn(provider, 'detectNetwork').mockImplementation(async () => getNetwork('mainnet'));

  beforeEach(async () => {
    const imports = [
      MikroOrmModule.forRoot(mikroORMConfig),
      MockLoggerModule.forRoot({
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
      }),
      ValidatorRegistryModule.forFeature({ provider }),
    ];
    moduleRef = await Test.createTestingModule({
      imports,
      providers: [{ provide: LOGGER_PROVIDER, useValue: {} }],
    }).compile();
    registryService = moduleRef.get(ValidatorRegistryService);
    registryStorageService = moduleRef.get(RegistryStorageService);
    mikroOrm = moduleRef.get(MikroORM);
    const generator = mikroOrm.getSchemaGenerator();
    await generator.updateSchema();
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
