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
  RegistryMetaStorageService,
  RegistryOperatorStorageService,
} from '../../';
import { keys, meta, newKey, newOperator, operators, operatorWithDefaultsRecords } from '../fixtures/db.fixture';
import {
  clone,
  compareTestMeta,
  compareTestMetaData,
  compareTestMetaKeys,
  compareTestMetaOperators,
} from '../testing.utils';
import { registryServiceMock } from '../mock-utils';
import { MikroORM } from '@mikro-orm/core';

describe('Registry', () => {
  const provider = new JsonRpcBatchProvider(process.env.PROVIDERS_URLS);

  let registryService: KeyRegistryService;
  let registryStorageService: RegistryStorageService;

  let keyStorageService: RegistryKeyStorageService;
  let metaStorageService: RegistryMetaStorageService;
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
    metaStorageService = moduleRef.get(RegistryMetaStorageService);
    operatorStorageService = moduleRef.get(RegistryOperatorStorageService);

    const generator = moduleRef.get(MikroORM).getSchemaGenerator();
    await generator.updateSchema();

    await keyStorageService.save(keys);
    await metaStorageService.save(meta);
    await operatorStorageService.save(operators);
  });

  afterEach(async () => {
    mockCall.mockReset();
    await registryService.clear();
    await registryStorageService.onModuleDestroy();
  });

  describe('update', () => {
    test('same data', async () => {
      const saveRegistryMock = jest.spyOn(registryService, 'save');

      registryServiceMock(moduleRef, provider, {
        keys,
        meta,
        operators,
      });

      await registryService.update('latest');
      expect(saveRegistryMock).toBeCalledTimes(0);
      await compareTestMeta(registryService, { keys, meta, operators });
    });

    test('new key without keysOpIndex updating', async () => {
      const saveRegistryMock = jest.spyOn(registryService, 'save');

      registryServiceMock(moduleRef, provider, {
        keys: [...keys, newKey],
        meta,
        operators,
      });

      await registryService.update('latest');
      expect(saveRegistryMock).toBeCalledTimes(0);
    });

    test('keys is not mutating', async () => {
      const newKeys = clone(keys);
      newKeys[0].used = false;

      const newMeta = {
        ...meta,
        keysOpIndex: meta.keysOpIndex + 1,
      };
      const saveRegistryMock = jest.spyOn(registryService, 'save');

      registryServiceMock(moduleRef, provider, {
        keys: newKeys,
        meta: newMeta,
        operators,
      });

      await registryService.update('latest');
      expect(saveRegistryMock).toBeCalledTimes(1);
      await compareTestMetaData(registryService, { meta: newMeta });
      await compareTestMetaKeys(registryService, { keys });
      await compareTestMetaOperators(registryService, { operators });
    });

    test('looking for totalSigningKeys', async () => {
      const newKeys = clone([...keys, newKey]);

      const newOperators = clone(operators);
      newOperators[0].totalSigningKeys++;

      const newMeta = {
        ...meta,
        keysOpIndex: meta.keysOpIndex + 1,
      };

      const saveRegistryMock = jest.spyOn(registryService, 'save');

      registryServiceMock(moduleRef, provider, {
        keys: newKeys,
        meta: newMeta,
        operators: newOperators,
      });

      await registryService.update('latest');
      expect(saveRegistryMock).toBeCalledTimes(1);
      await compareTestMetaData(registryService, { meta: newMeta });
      await compareTestMetaKeys(registryService, { keys: newKeys });
      await compareTestMetaOperators(registryService, {
        operators: newOperators,
      });
    });

    test('add new operator', async () => {
      const newOperators = clone([...operators, newOperator]);

      const newMeta = {
        ...meta,
        keysOpIndex: meta.keysOpIndex + 1,
      };

      const saveRegistryMock = jest.spyOn(registryService, 'save');

      registryServiceMock(moduleRef, provider, {
        keys,
        meta: newMeta,
        operators: newOperators,
      });

      await registryService.update('latest');
      expect(saveRegistryMock).toBeCalledTimes(1);
      await compareTestMetaData(registryService, { meta: newMeta });
      await compareTestMetaKeys(registryService, { keys: keys });
      await compareTestMetaOperators(registryService, {
        operators: newOperators,
      });
    });

    test('add operator with default records', async () => {
      const newOperators = clone([...operators, operatorWithDefaultsRecords]);

      const newMeta = {
        ...meta,
        keysOpIndex: meta.keysOpIndex + 1,
      };

      const saveRegistryMock = jest.spyOn(registryService, 'save');

      registryServiceMock(moduleRef, provider, {
        keys,
        meta: newMeta,
        operators: newOperators,
      });

      await registryService.update('latest');
      expect(saveRegistryMock).toBeCalledTimes(1);
      await compareTestMetaData(registryService, { meta: newMeta });
      await compareTestMetaKeys(registryService, { keys: keys });
      await compareTestMetaOperators(registryService, {
        operators: newOperators,
      });
    });

    test('delete keys from operator', async () => {
      const newOperators = clone(operators);
      newOperators[0].usedSigningKeys--;

      const newMeta = {
        ...meta,
        keysOpIndex: meta.keysOpIndex + 1,
      };

      const saveRegistryMock = jest.spyOn(registryService, 'save');

      registryServiceMock(moduleRef, provider, {
        keys,
        meta: newMeta,
        operators: newOperators,
      });

      await registryService.update('latest');
      expect(saveRegistryMock).toBeCalledTimes(1);
      await compareTestMetaData(registryService, { meta: newMeta });
      await compareTestMetaKeys(registryService, { keys: keys });
      await compareTestMetaOperators(registryService, {
        operators: newOperators,
      });
    });

    test('out of total signing keys limit', async () => {
      const newOperators = clone(operators);
      newOperators[0].totalSigningKeys--;

      const newMeta = {
        ...meta,
        keysOpIndex: meta.keysOpIndex + 1,
      };

      const saveRegistryMock = jest.spyOn(registryService, 'save');

      registryServiceMock(moduleRef, provider, {
        keys,
        meta: newMeta,
        operators: newOperators,
      });

      await registryService.update('latest');
      expect(saveRegistryMock).toBeCalledTimes(1);
      await compareTestMetaData(registryService, { meta: newMeta });
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
