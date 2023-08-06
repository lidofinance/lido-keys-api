import { Test, TestingModule } from '@nestjs/testing';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { nullTransport, LoggerModule, LOGGER_PROVIDER, MockLoggerModule } from '@lido-nestjs/logger';
import { getNetwork } from '@ethersproject/networks';
import { JsonRpcBatchProvider } from '@ethersproject/providers';
import {
  ValidatorRegistryModule,
  ValidatorRegistryService,
  RegistryStorageService,
  RegistryKeyStorageService,
  RegistryOperatorStorageService,
} from '../../';
import { keys, newKey, newOperator, operators, operatorWithDefaultsRecords } from '../fixtures/db.fixture';
import { clone, compareTestMeta, compareTestMetaKeys, compareTestMetaOperators } from '../testing.utils';
import { registryServiceMock } from '../mock-utils';
import { MikroORM } from '@mikro-orm/core';
import { REGISTRY_CONTRACT_ADDRESSES } from '@lido-nestjs/contracts';

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

  let moduleRef: TestingModule;

  const mockCall = jest.spyOn(provider, 'call').mockImplementation(async () => '');

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
      ValidatorRegistryModule.forFeature({ provider }),
    ];

    moduleRef = await Test.createTestingModule({ imports }).compile();

    registryService = moduleRef.get(ValidatorRegistryService);
    registryStorageService = moduleRef.get(RegistryStorageService);
    keyStorageService = moduleRef.get(RegistryKeyStorageService);
    operatorStorageService = moduleRef.get(RegistryOperatorStorageService);

    const generator = moduleRef.get(MikroORM).getSchemaGenerator();
    await generator.updateSchema();

    await keyStorageService.save(keysWithModuleAddress);
    await operatorStorageService.save(operatorsWithModuleAddress);
  });

  afterEach(async () => {
    mockCall.mockReset();
    await registryService.clear();
    await registryStorageService.onModuleDestroy();
  });

  describe('update', () => {
    test('same data', async () => {
      const saveOperatorRegistryMock = jest.spyOn(registryService, 'saveOperators');
      const saveKeyRegistryMock = jest.spyOn(registryService, 'saveKeys');

      registryServiceMock(moduleRef, provider, {
        keys: keysWithModuleAddress,
        operators: operatorsWithModuleAddress,
      });

      await registryService.update(address, 'latest');
      // update function doesn't make a decision about update no more
      // so here would happen update if list of keys was changed
      expect(saveOperatorRegistryMock).toBeCalledTimes(1);
      // 2 - number of operators
      expect(saveKeyRegistryMock).toBeCalledTimes(2);
      await compareTestMeta(registryService, { keys: keysWithModuleAddress, operators: operatorsWithModuleAddress });
    });

    test('new key without keysOpIndex updating', async () => {
      const saveRegistryMock = jest.spyOn(registryService, 'saveOperators');
      const saveKeyRegistryMock = jest.spyOn(registryService, 'saveKeys');

      registryServiceMock(moduleRef, provider, {
        keys: [...keysWithModuleAddress, { ...newKey, moduleAddress: address }],
        operators: operatorsWithModuleAddress,
      });

      await registryService.update(address, 'latest');
      expect(saveRegistryMock).toBeCalledTimes(1);
      expect(saveKeyRegistryMock).toBeCalledTimes(2);
    });

    test('keys is not mutating', async () => {
      const newKeys = clone(keysWithModuleAddress);
      newKeys[0].used = false;

      const saveRegistryMock = jest.spyOn(registryService, 'saveOperators');
      const saveKeyRegistryMock = jest.spyOn(registryService, 'saveKeys');

      registryServiceMock(moduleRef, provider, {
        keys: newKeys,
        operators: operatorsWithModuleAddress,
      });

      await registryService.update(address, 'latest');
      expect(saveRegistryMock).toBeCalledTimes(1);
      expect(saveKeyRegistryMock.mock.calls.length).toBeGreaterThanOrEqual(1);
      await compareTestMetaKeys(registryService, { keys: keysWithModuleAddress });
      await compareTestMetaOperators(registryService, { operators: operatorsWithModuleAddress });
    });

    test('looking only for used keys', async () => {
      const newKeys = clone([...keysWithModuleAddress, { ...newKey, moduleAddress: address }]);
      const newOperators = clone(operatorsWithModuleAddress);
      newOperators[0].totalSigningKeys++;

      const saveRegistryMock = jest.spyOn(registryService, 'saveOperators');
      const saveKeyRegistryMock = jest.spyOn(registryService, 'saveKeys');

      registryServiceMock(moduleRef, provider, {
        keys: newKeys,
        operators: newOperators,
      });

      await registryService.update(address, 'latest');
      expect(saveRegistryMock).toBeCalledTimes(1);
      expect(saveKeyRegistryMock.mock.calls.length).toBeGreaterThanOrEqual(1);
      await compareTestMetaKeys(registryService, { keys: keysWithModuleAddress });
      await compareTestMetaOperators(registryService, {
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

      await registryService.update(address, 'latest');
      expect(saveRegistryMock).toBeCalledTimes(1);
      expect(saveKeyRegistryMock.mock.calls.length).toBeGreaterThanOrEqual(1);
      await compareTestMetaKeys(registryService, { keys: keysWithModuleAddress });
      await compareTestMetaOperators(registryService, {
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

      await registryService.update(address, 'latest');
      expect(saveOperatorRegistryMock).toBeCalledTimes(1);
      expect(saveKeyRegistryMock.mock.calls.length).toBeGreaterThanOrEqual(1);
      await compareTestMetaKeys(registryService, { keys: keysWithModuleAddress });
      await compareTestMetaOperators(registryService, {
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

      await registryService.update(address, 'latest');
      expect(saveRegistryMock).toBeCalledTimes(1);
      expect(saveKeyRegistryMock.mock.calls.length).toBeGreaterThanOrEqual(1);
      await compareTestMetaKeys(registryService, { keys: keysWithModuleAddress });
      await compareTestMetaOperators(registryService, {
        operators: newOperators,
      });
    });

    test('out of total signing keys limit', async () => {
      const newOperators = clone(operatorsWithModuleAddress);
      newOperators[0].totalSigningKeys--;
      const saveOperatorRegistryMock = jest.spyOn(registryService, 'saveOperators');
      const saveKeyRegistryMock = jest.spyOn(registryService, 'saveKeys');

      registryServiceMock(moduleRef, provider, {
        keys: keysWithModuleAddress,
        operators: newOperators,
      });

      await registryService.update(address, 'latest');
      expect(saveOperatorRegistryMock).toBeCalledTimes(1);
      expect(saveKeyRegistryMock.mock.calls.length).toBeGreaterThanOrEqual(1);
      await compareTestMetaOperators(registryService, {
        operators: newOperators,
      });

      const firstOperatorKeys = await (
        await registryService.getOperatorsKeysFromStorage()
      ).filter(({ operatorIndex }) => operatorIndex === 0);

      expect(firstOperatorKeys.length).toBe(newOperators[0].totalSigningKeys);
    });
  });
});

describe('Empty registry', () => {
  const provider = new JsonRpcBatchProvider(process.env.PROVIDERS_URLS);
  let registryService: ValidatorRegistryService;
  let registryStorageService: RegistryStorageService;
  let moduleRef: TestingModule;
  const mockCall = jest.spyOn(provider, 'call').mockImplementation(async () => '');
  if (!process.env.CHAIN_ID) {
    console.error("CHAIN_ID wasn't provides");
    process.exit(1);
  }
  const address = REGISTRY_CONTRACT_ADDRESSES[process.env.CHAIN_ID];

  const keysWithModuleAddress = keys.map((key) => {
    return { ...key, moduleAddress: address };
  });

  const operatorsWithModuleAddress = operators.map((key) => {
    return { ...key, moduleAddress: address };
  });

  jest.spyOn(provider, 'detectNetwork').mockImplementation(async () => getNetwork('mainnet'));

  beforeEach(async () => {
    const imports = [
      MikroOrmModule.forRoot({
        dbName: ':memory:',
        type: 'sqlite',
        allowGlobalContext: true,
        entities: ['./**/*.entity.ts'],
      }),
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
    const generator = moduleRef.get(MikroORM).getSchemaGenerator();
    await generator.updateSchema();
  });
  afterEach(async () => {
    mockCall.mockReset();
    await registryService.clear();
    await registryStorageService.onModuleDestroy();
  });
  test('init on update', async () => {
    const saveRegistryMock = jest.spyOn(registryService, 'saveOperators');
    const saveKeyRegistryMock = jest.spyOn(registryService, 'saveKeys');
    registryServiceMock(moduleRef, provider, {
      keys: keysWithModuleAddress,
      operators: operatorsWithModuleAddress,
    });
    await registryService.update(address, 'latest');
    expect(saveRegistryMock).toBeCalledTimes(1);
    expect(saveKeyRegistryMock.mock.calls.length).toBeGreaterThanOrEqual(1);
    await compareTestMeta(registryService, { keys: keysWithModuleAddress, operators: operatorsWithModuleAddress });
    await registryService.update(address, 'latest');
  });
});
