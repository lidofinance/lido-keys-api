import { Test, TestingModule } from '@nestjs/testing';
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
import { keys, newKey, newOperator, operators, operatorWithDefaultsRecords } from '../fixtures/db.fixture';
import { clone, compareTestMeta, compareTestMetaKeys, compareTestMetaOperators } from '../testing.utils';
import { registryServiceMock } from '../mock-utils';
import { MikroORM } from '@mikro-orm/core';
import { REGISTRY_CONTRACT_ADDRESSES } from '@lido-nestjs/contracts';
import * as dotenv from 'dotenv';

dotenv.config();

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
      KeyRegistryModule.forFeature({ provider }),
    ];

    moduleRef = await Test.createTestingModule({ imports }).compile();
    registryService = moduleRef.get(KeyRegistryService);
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
      const saveRegistryMock = jest.spyOn(registryService, 'saveOperators');
      const saveKeyRegistryMock = jest.spyOn(registryService, 'saveKeys');

      registryServiceMock(moduleRef, provider, {
        keys: keysWithModuleAddress,
        operators: operatorsWithModuleAddress,
      });

      await registryService.update(address, 'latest');
      expect(saveRegistryMock).toBeCalledTimes(1);
      // 2 - number of operators
      expect(saveKeyRegistryMock).toBeCalledTimes(2);
      await compareTestMeta(registryService, { keys: keysWithModuleAddress, operators: operatorsWithModuleAddress });
    });

    // this test now the same as same data. as both of them were based on keyOpIndex. now we check it on the level above
    test('new key without keysOpIndex updating', async () => {
      const saveRegistryMock = jest.spyOn(registryService, 'saveOperators');
      const saveKeyRegistryMock = jest.spyOn(registryService, 'saveKeys');

      registryServiceMock(moduleRef, provider, {
        keys: [...keysWithModuleAddress, { ...newKey, moduleAddress: address }],
        operators: operatorsWithModuleAddress,
      });

      // update function doesn't make a decision about update no more
      // so here would happen update if list of keys was changed
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

    test('looking for totalSigningKeys', async () => {
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

      await compareTestMetaKeys(registryService, { keys: newKeys });
      await compareTestMetaOperators(registryService, {
        operators: newOperators,
      });
    });

    test('add new operator', async () => {
      const newOperators = clone([...operatorsWithModuleAddress, { ...newOperator, moduleAddress: address }]);

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

    // TODO: What is the difference with test above?
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

      await registryService.update(address, 'latest');
      expect(saveOperatorsRegistryMock).toBeCalledTimes(1);
      expect(saveKeyRegistryMock.mock.calls.length).toBeGreaterThanOrEqual(1);
      await compareTestMetaKeys(registryService, { keys: keysWithModuleAddress });
      await compareTestMetaOperators(registryService, {
        operators: newOperators,
      });
    });

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
      // during update we remove all keys from the database that are greater than the total number of keys
      const newOperators = clone(operatorsWithModuleAddress);
      newOperators[0].totalSigningKeys--;

      const saveRegistryMock = jest.spyOn(registryService, 'saveOperators');
      const saveKeyRegistryMock = jest.spyOn(registryService, 'saveKeys');
      registryServiceMock(moduleRef, provider, {
        keys: keysWithModuleAddress,
        operators: newOperators,
      });
      await registryService.update(address, 'latest');
      expect(saveRegistryMock).toBeCalledTimes(1);
      expect(saveKeyRegistryMock.mock.calls.length).toBeGreaterThanOrEqual(1);

      await compareTestMetaOperators(registryService, {
        operators: newOperators,
      });
      const firstOperatorKeys = await (
        await registryService.getAllKeysFromStorage()
      ).filter(({ operatorIndex }) => operatorIndex === 0);
      expect(firstOperatorKeys.length).toBe(newOperators[0].totalSigningKeys);
    });
  });
});
