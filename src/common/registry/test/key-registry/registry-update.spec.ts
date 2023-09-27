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
import {
  clone,
  compareTestKeysAndOperators,
  compareTestKeys,
  compareTestOperators,
  mikroORMConfig,
  clearDb,
} from '../testing.utils';
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
  let mikroOrm: MikroORM;

  let moduleRef: TestingModule;

  const mockCall = jest.spyOn(provider, 'call').mockImplementation(async () => '');

  jest.spyOn(provider, 'detectNetwork').mockImplementation(async () => getNetwork('mainnet'));

  beforeEach(async () => {
    const imports = [
      MikroOrmModule.forRoot(mikroORMConfig),
      LoggerModule.forRoot({ transports: [nullTransport()] }),
      KeyRegistryModule.forFeature({ provider }),
    ];

    moduleRef = await Test.createTestingModule({ imports }).compile();
    registryService = moduleRef.get(KeyRegistryService);
    registryStorageService = moduleRef.get(RegistryStorageService);

    keyStorageService = moduleRef.get(RegistryKeyStorageService);
    operatorStorageService = moduleRef.get(RegistryOperatorStorageService);

    mikroOrm = moduleRef.get(MikroORM);
    const generator = mikroOrm.getSchemaGenerator();
    await generator.updateSchema();

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

      const blockHash = '0x4ef0f15a8a04a97f60a9f76ba83d27bcf98dac9635685cd05fe1d78bd6e93418';

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

      const blockHash = '0x4ef0f15a8a04a97f60a9f76ba83d27bcf98dac9635685cd05fe1d78bd6e93418';

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

      const blockHash = '0x4ef0f15a8a04a97f60a9f76ba83d27bcf98dac9635685cd05fe1d78bd6e93418';

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

      const blockHash = '0x4ef0f15a8a04a97f60a9f76ba83d27bcf98dac9635685cd05fe1d78bd6e93418';

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

      const blockHash = '0x4ef0f15a8a04a97f60a9f76ba83d27bcf98dac9635685cd05fe1d78bd6e93418';

      await registryService.update(address, blockHash);
      expect(saveOperatorsRegistryMock).toBeCalledTimes(1);
      expect(saveKeyRegistryMock.mock.calls.length).toBeGreaterThanOrEqual(1);
      await compareTestKeys(address, registryService, { keys: keysWithModuleAddress });
      await compareTestOperators(address, registryService, {
        operators: newOperators,
      });
    });

    test('delete keys from operator', async () => {
      // keys will be updated in range form = usedSigningKeys to=totalSigningKeys
      const newOperators = clone(operatorsWithModuleAddress);
      newOperators[0].usedSigningKeys--;

      const saveOperatorsRegistryMock = jest.spyOn(registryService, 'saveOperators');
      const saveKeyRegistryMock = jest.spyOn(registryService, 'saveKeys');

      registryServiceMock(moduleRef, provider, {
        keys: keysWithModuleAddress,
        operators: newOperators,
      });

      const blockHash = '0x4ef0f15a8a04a97f60a9f76ba83d27bcf98dac9635685cd05fe1d78bd6e93418';

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
      const blockHash = '0x4ef0f15a8a04a97f60a9f76ba83d27bcf98dac9635685cd05fe1d78bd6e93418';

      await registryService.update(address, blockHash);
      expect(saveOperatorsRegistryMock).toBeCalledTimes(1);
      expect(saveKeyRegistryMock.mock.calls.length).toBeGreaterThanOrEqual(1);

      await compareTestOperators(address, registryService, {
        operators: newOperators,
      });
      const keysOfoperator0 = await (
        await registryService.getModuleKeysFromStorage(address)
      ).filter(({ operatorIndex }) => operatorIndex === 0);
      expect(keysOfoperator0.length).toBe(newOperators[0].totalSigningKeys);
    });

    // test('usedSigningKeys value changed in operator', async () => {
    //   const newOperators = clone(operatorsWithModuleAddress);
    //   newOperators[0].usedSigningKeys++;

    //   const saveOperatorsRegistryMock = jest.spyOn(registryService, 'saveOperators');
    //   const saveKeyRegistryMock = jest.spyOn(registryService, 'saveKeys');

    //   registryServiceMock(moduleRef, provider, {
    //     keys: keysWithModuleAddress,
    //     operators: newOperators,
    //   });

    //   const blockHash = '0x4ef0f15a8a04a97f60a9f76ba83d27bcf98dac9635685cd05fe1d78bd6e93418';

    //   await registryService.update(address, blockHash);
    //   expect(saveOperatorsRegistryMock).toBeCalledTimes(1);
    //   expect(saveKeyRegistryMock.mock.calls.length).toBeGreaterThanOrEqual(1);
    //   await compareTestKeys(address, registryService, { keys: keysWithModuleAddress });
    //   await compareTestOperators(address, registryService, {
    //     operators: newOperators,
    //   });
    // });
  });
});
