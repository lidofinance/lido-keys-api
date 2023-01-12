/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test } from '@nestjs/testing';
import { KeysController, KeysService } from '../../src/http/keys';
import { hexZeroPad } from '@ethersproject/bytes';
import { RegistryService } from '../../src/jobs/registry.service';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { ConfigService } from '../../src/common/config';

describe('Keys controller', () => {
  let keysController: KeysController;
  let registryService: RegistryService;

  // const OLD_ENV = process.env;
  const registryKeys = [
    {
      index: 1,
      operatorIndex: 1,
      key: hexZeroPad('0x12', 98),
      depositSignature: hexZeroPad('0x12', 194),
      used: true,
    },
    {
      index: 2,
      operatorIndex: 2,
      key: hexZeroPad('0x13', 98),
      depositSignature: hexZeroPad('0x13', 194),
      used: true,
    },
    {
      index: 3,
      operatorIndex: 2,
      key: hexZeroPad('0x13', 98),
      depositSignature: hexZeroPad('0x13', 194),
      used: false,
    },
  ];

  const meta = {
    blockNumber: 15819109,
    blockHash: '0x5ba6b9e7cfbbcdd0171f8c2ca5ff08852156e26cf26c722362c63d8c66ac2c15',
    timestamp: 0,
    keysOpIndex: 0,
  };

  class ConfigServiceMock {
    get(value) {
      return process.env[value];
    }
  }

  class RegistryServiceMock {
    getKeysWithMeta(filters) {
      return Promise.resolve({ keys: registryKeys, meta });
    }
    getKeyWithMetaByPubkey(pubkey: string) {
      const keys = registryKeys.filter((el) => el.key == pubkey);
      return Promise.resolve({ keys, meta });
    }

    getKeysWithMetaByPubkeys(pubkeys: string[]) {
      const keys = registryKeys.filter((el) => pubkeys.includes(el.key));
      return Promise.resolve({ keys, meta });
    }
  }

  const OLD_ENV = process.env;

  beforeEach(async () => {
    jest.resetModules();
    process.env = { ...OLD_ENV };

    const moduleRef = await Test.createTestingModule({
      controllers: [KeysController],
      providers: [
        KeysService,
        {
          provide: RegistryService,
          useClass: RegistryServiceMock,
        },
        {
          provide: ConfigService,
          useClass: ConfigServiceMock,
        },
        {
          provide: LOGGER_PROVIDER,
          useFactory: () => ({
            log: jest.fn(),
          }),
        },
      ],
    }).compile();
    keysController = moduleRef.get<KeysController>(KeysController);
    registryService = moduleRef.get<RegistryService>(RegistryService);
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  describe('get', () => {
    test('keys on Mainnet', async () => {
      process.env['CHAIN_ID'] = '1';

      const getKeysWithMetaMock = jest.spyOn(registryService, 'getKeysWithMeta');

      const result = await keysController.get({ used: true, operatorIndex: 1 });

      expect(getKeysWithMetaMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).toBeCalledWith({ used: true, operatorIndex: 1 });

      expect(result).toEqual({
        data: [
          {
            depositSignature: hexZeroPad('0x12', 194),
            key: hexZeroPad('0x12', 98),
            moduleAddress: '0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5',
            operatorIndex: 1,
            used: true,
          },
          {
            depositSignature: hexZeroPad('0x13', 194),
            key: hexZeroPad('0x13', 98),
            moduleAddress: '0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5',
            operatorIndex: 2,
            used: true,
          },
          {
            depositSignature: hexZeroPad('0x13', 194),
            key: hexZeroPad('0x13', 98),
            moduleAddress: '0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5',
            operatorIndex: 2,
            used: false,
          },
        ],
        meta: {
          elBlockSnapshot: {
            blockHash: '0x5ba6b9e7cfbbcdd0171f8c2ca5ff08852156e26cf26c722362c63d8c66ac2c15',
            blockNumber: 15819109,
            timestamp: 0,
          },
        },
      });
    });

    test('keys on Goerli', async () => {
      process.env['CHAIN_ID'] = '5';

      const getKeysWithMetaMock = jest.spyOn(registryService, 'getKeysWithMeta');

      const result = await keysController.get({ used: true, operatorIndex: 1 });

      expect(getKeysWithMetaMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).toBeCalledWith({ used: true, operatorIndex: 1 });

      expect(result).toEqual({
        data: [
          {
            depositSignature: hexZeroPad('0x12', 194),
            key: hexZeroPad('0x12', 98),
            moduleAddress: '0x9D4AF1Ee19Dad8857db3a45B0374c81c8A1C6320',
            operatorIndex: 1,
            used: true,
          },
          {
            depositSignature: hexZeroPad('0x13', 194),
            key: hexZeroPad('0x13', 98),
            moduleAddress: '0x9D4AF1Ee19Dad8857db3a45B0374c81c8A1C6320',
            operatorIndex: 2,
            used: true,
          },
          {
            depositSignature: hexZeroPad('0x13', 194),
            key: hexZeroPad('0x13', 98),
            moduleAddress: '0x9D4AF1Ee19Dad8857db3a45B0374c81c8A1C6320',
            operatorIndex: 2,
            used: false,
          },
        ],
        meta: {
          elBlockSnapshot: {
            blockHash: '0x5ba6b9e7cfbbcdd0171f8c2ca5ff08852156e26cf26c722362c63d8c66ac2c15',
            blockNumber: 15819109,
            timestamp: 0,
          },
        },
      });
    });
  });

  describe('getByPubkey', () => {
    test('keys on Mainnet', async () => {
      process.env['CHAIN_ID'] = '1';

      const getKeyWithMetaByPubkeyMock = jest.spyOn(registryService, 'getKeyWithMetaByPubkey');

      const result = await keysController.getByPubkey(hexZeroPad('0x13', 98));

      expect(getKeyWithMetaByPubkeyMock).toBeCalledTimes(1);
      expect(getKeyWithMetaByPubkeyMock).toBeCalledWith(hexZeroPad('0x13', 98));

      expect(result).toEqual({
        data: [
          {
            depositSignature: hexZeroPad('0x13', 194),
            key: hexZeroPad('0x13', 98),
            moduleAddress: '0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5',
            operatorIndex: 2,
            used: true,
          },
          {
            depositSignature: hexZeroPad('0x13', 194),
            key: hexZeroPad('0x13', 98),
            moduleAddress: '0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5',
            operatorIndex: 2,
            used: false,
          },
        ],
        meta: {
          elBlockSnapshot: {
            blockHash: '0x5ba6b9e7cfbbcdd0171f8c2ca5ff08852156e26cf26c722362c63d8c66ac2c15',
            blockNumber: 15819109,
            timestamp: 0,
          },
        },
      });
    });

    test('keys on Goerli', async () => {
      process.env['CHAIN_ID'] = '5';

      const getKeyWithMetaByPubkeyMock = jest.spyOn(registryService, 'getKeyWithMetaByPubkey');

      const result = await keysController.getByPubkey(hexZeroPad('0x13', 98));

      expect(getKeyWithMetaByPubkeyMock).toBeCalledTimes(1);
      expect(getKeyWithMetaByPubkeyMock).toBeCalledWith(hexZeroPad('0x13', 98));

      expect(result).toEqual({
        data: [
          {
            depositSignature: hexZeroPad('0x13', 194),
            key: hexZeroPad('0x13', 98),
            moduleAddress: '0x9D4AF1Ee19Dad8857db3a45B0374c81c8A1C6320',
            operatorIndex: 2,
            used: true,
          },
          {
            depositSignature: hexZeroPad('0x13', 194),
            key: hexZeroPad('0x13', 98),
            moduleAddress: '0x9D4AF1Ee19Dad8857db3a45B0374c81c8A1C6320',
            operatorIndex: 2,
            used: false,
          },
        ],
        meta: {
          elBlockSnapshot: {
            blockHash: '0x5ba6b9e7cfbbcdd0171f8c2ca5ff08852156e26cf26c722362c63d8c66ac2c15',
            blockNumber: 15819109,
            timestamp: 0,
          },
        },
      });
    });
  });

  describe('getByPubkeys', () => {
    test('keys on Mainnet', async () => {
      process.env['CHAIN_ID'] = '1';

      const getKeysWithMetaByPubkeysMock = jest.spyOn(registryService, 'getKeysWithMetaByPubkeys');

      const result = await keysController.getByPubkeys([hexZeroPad('0x13', 98), hexZeroPad('0x12', 98)]);

      expect(getKeysWithMetaByPubkeysMock).toBeCalledTimes(1);
      expect(getKeysWithMetaByPubkeysMock).toBeCalledWith([hexZeroPad('0x13', 98), hexZeroPad('0x12', 98)]);

      expect(result).toEqual({
        data: [
          {
            operatorIndex: 1,
            key: hexZeroPad('0x12', 98),
            depositSignature: hexZeroPad('0x12', 194),
            used: true,
            moduleAddress: '0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5',
          },
          {
            depositSignature: hexZeroPad('0x13', 194),
            key: hexZeroPad('0x13', 98),
            moduleAddress: '0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5',
            operatorIndex: 2,
            used: true,
          },
          {
            depositSignature: hexZeroPad('0x13', 194),
            key: hexZeroPad('0x13', 98),
            moduleAddress: '0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5',
            operatorIndex: 2,
            used: false,
          },
        ],
        meta: {
          elBlockSnapshot: {
            blockHash: '0x5ba6b9e7cfbbcdd0171f8c2ca5ff08852156e26cf26c722362c63d8c66ac2c15',
            blockNumber: 15819109,
            timestamp: 0,
          },
        },
      });
    });

    test('keys on Goerli', async () => {
      process.env['CHAIN_ID'] = '5';

      const getKeysWithMetaByPubkeysMock = jest.spyOn(registryService, 'getKeysWithMetaByPubkeys');

      const result = await keysController.getByPubkeys([hexZeroPad('0x13', 98), hexZeroPad('0x12', 98)]);

      expect(getKeysWithMetaByPubkeysMock).toBeCalledTimes(1);
      expect(getKeysWithMetaByPubkeysMock).toBeCalledWith([hexZeroPad('0x13', 98), hexZeroPad('0x12', 98)]);

      expect(result).toEqual({
        data: [
          {
            operatorIndex: 1,
            key: hexZeroPad('0x12', 98),
            depositSignature: hexZeroPad('0x12', 194),
            used: true,
            moduleAddress: '0x9D4AF1Ee19Dad8857db3a45B0374c81c8A1C6320',
          },
          {
            depositSignature: hexZeroPad('0x13', 194),
            key: hexZeroPad('0x13', 98),
            moduleAddress: '0x9D4AF1Ee19Dad8857db3a45B0374c81c8A1C6320',
            operatorIndex: 2,
            used: true,
          },
          {
            depositSignature: hexZeroPad('0x13', 194),
            key: hexZeroPad('0x13', 98),
            moduleAddress: '0x9D4AF1Ee19Dad8857db3a45B0374c81c8A1C6320',
            operatorIndex: 2,
            used: false,
          },
        ],
        meta: {
          elBlockSnapshot: {
            blockHash: '0x5ba6b9e7cfbbcdd0171f8c2ca5ff08852156e26cf26c722362c63d8c66ac2c15',
            blockNumber: 15819109,
            timestamp: 0,
          },
        },
      });
    });
  });
});
