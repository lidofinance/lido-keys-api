/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test } from '@nestjs/testing';
import { SRModulesController, SRModulesService } from '../../src/http/sr-modules';
import { ConfigService } from '../../src/common/config';
import { hexZeroPad } from '@ethersproject/bytes';
import { RegistryService } from '../../src/jobs/registry.service';

describe('StakingRouterModules controller', () => {
  let modulesController: SRModulesController;
  let registryService: RegistryService;

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

  function expectedModule(address = '0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5') {
    return {
      id: 1,
      lastDepositAt: undefined,
      lastDepositBlock: undefined,
      moduleFee: undefined,
      name: 'NodeOperatorRegistry',
      nonce: 0,
      stakingModuleAddress: address,
      status: undefined,
      targetShare: undefined,
      treasuryFee: undefined,
      type: 'grouped-onchain-v1',
    };
  }

  class ConfigServiceMock {
    get(value) {
      return process.env[value];
    }
  }

  class RegistryServiceMock {
    getMetaDataFromStorage() {
      return Promise.resolve(meta);
    }
    getKeysWithMeta(filters) {
      return Promise.resolve({ keys: registryKeys, meta });
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
      controllers: [SRModulesController],
      providers: [
        SRModulesService,
        {
          provide: RegistryService,
          useClass: RegistryServiceMock,
        },
        {
          provide: ConfigService,
          useClass: ConfigServiceMock,
        },
      ],
    }).compile();

    modulesController = moduleRef.get<SRModulesController>(SRModulesController);
    registryService = moduleRef.get<RegistryService>(RegistryService);
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  describe('getModules', () => {
    test('modules on mainnet', async () => {
      process.env['CHAIN_ID'] = '1';
      const getMetaDataFromStorageMock = jest.spyOn(registryService, 'getMetaDataFromStorage');
      const result = await modulesController.getModules();

      expect(getMetaDataFromStorageMock).toBeCalledTimes(1);
      expect(result).toEqual({
        data: [expectedModule()],
        elBlockSnapshot: {
          blockHash: '0x5ba6b9e7cfbbcdd0171f8c2ca5ff08852156e26cf26c722362c63d8c66ac2c15',
          blockNumber: 15819109,
          timestamp: 0,
        },
      });
    });

    test('modules on goerli', async () => {
      process.env['CHAIN_ID'] = '5';
      const getMetaDataFromStorageMock = jest.spyOn(registryService, 'getMetaDataFromStorage');
      const result = await modulesController.getModules();

      expect(getMetaDataFromStorageMock).toBeCalledTimes(1);
      expect(result).toEqual({
        data: [expectedModule('0x9D4AF1Ee19Dad8857db3a45B0374c81c8A1C6320')],
        elBlockSnapshot: {
          blockHash: '0x5ba6b9e7cfbbcdd0171f8c2ca5ff08852156e26cf26c722362c63d8c66ac2c15',
          blockNumber: 15819109,
          timestamp: 0,
        },
      });
    });
  });

  describe('getModule', () => {
    test('module on mainnet', async () => {
      process.env['CHAIN_ID'] = '1';
      const getMetaDataFromStorageMock = jest.spyOn(registryService, 'getMetaDataFromStorage');

      const result = await modulesController.getModule('0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5');
      expect(getMetaDataFromStorageMock).toBeCalledTimes(1);
      expect(result).toEqual({
        data: expectedModule(),
        elBlockSnapshot: {
          blockHash: '0x5ba6b9e7cfbbcdd0171f8c2ca5ff08852156e26cf26c722362c63d8c66ac2c15',
          blockNumber: 15819109,
          timestamp: 0,
        },
      });
    });

    test('module on goerli', async () => {
      process.env['CHAIN_ID'] = '5';
      const getMetaDataFromStorageMock = jest.spyOn(registryService, 'getMetaDataFromStorage');
      const result = await modulesController.getModule('0x9D4AF1Ee19Dad8857db3a45B0374c81c8A1C6320');
      expect(getMetaDataFromStorageMock).toBeCalledTimes(1);
      expect(result).toEqual({
        data: expectedModule('0x9D4AF1Ee19Dad8857db3a45B0374c81c8A1C6320'),
        elBlockSnapshot: {
          blockHash: '0x5ba6b9e7cfbbcdd0171f8c2ca5ff08852156e26cf26c722362c63d8c66ac2c15',
          blockNumber: 15819109,
          timestamp: 0,
        },
      });
    });

    test('module not found', async () => {
      process.env['CHAIN_ID'] = '1';
      const getMetaDataFromStorageMock = jest.spyOn(registryService, 'getMetaDataFromStorage');
      expect(modulesController.getModule('0x12345')).rejects.toThrowError(
        `Module with moduleId 0x12345 is not supported`,
      );
      expect(getMetaDataFromStorageMock).toBeCalledTimes(0);
    });
  });

  describe('getGroupedByModuleKeys', () => {
    test('get all keys on mainnet', async () => {
      process.env['CHAIN_ID'] = '1';
      const getKeysWithMetaMock = jest.spyOn(registryService, 'getKeysWithMeta');
      const result = await modulesController.getGroupedByModuleKeys({ used: true, operatorIndex: 1 });

      expect(getKeysWithMetaMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).lastCalledWith({ used: true, operatorIndex: 1 });
      expect(result).toEqual({
        data: [
          {
            keys: [
              {
                depositSignature: hexZeroPad('0x12', 194),
                key: hexZeroPad('0x12', 98),
                operatorIndex: 1,
                used: true,
              },
              {
                depositSignature: hexZeroPad('0x13', 194),
                key: hexZeroPad('0x13', 98),
                operatorIndex: 2,
                used: true,
              },
              {
                depositSignature: hexZeroPad('0x13', 194),
                key: hexZeroPad('0x13', 98),
                operatorIndex: 2,
                used: false,
              },
            ],
            module: expectedModule(),
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

    test('get all keys on goerli', async () => {
      process.env['CHAIN_ID'] = '5';
      const getKeysWithMetaMock = jest.spyOn(registryService, 'getKeysWithMeta');
      const result = await modulesController.getGroupedByModuleKeys({ used: true, operatorIndex: 1 });

      expect(getKeysWithMetaMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).lastCalledWith({ used: true, operatorIndex: 1 });
      expect(result).toEqual({
        data: [
          {
            keys: [
              {
                depositSignature: hexZeroPad('0x12', 194),
                key: hexZeroPad('0x12', 98),
                operatorIndex: 1,
                used: true,
              },
              {
                depositSignature: hexZeroPad('0x13', 194),
                key: hexZeroPad('0x13', 98),
                operatorIndex: 2,
                used: true,
              },
              {
                depositSignature: hexZeroPad('0x13', 194),
                key: hexZeroPad('0x13', 98),
                operatorIndex: 2,
                used: false,
              },
            ],
            module: expectedModule('0x9D4AF1Ee19Dad8857db3a45B0374c81c8A1C6320'),
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

  describe('getModuleKeys', () => {
    test('get module keys on mainnet', async () => {
      process.env['CHAIN_ID'] = '1';
      const getKeysWithMetaMock = jest.spyOn(registryService, 'getKeysWithMeta');
      const result = await modulesController.getModuleKeys('0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5', {
        used: true,
        operatorIndex: 1,
      });

      expect(getKeysWithMetaMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).lastCalledWith({ used: true, operatorIndex: 1 });
      expect(result).toEqual({
        data: {
          keys: [
            {
              depositSignature: hexZeroPad('0x12', 194),
              key: hexZeroPad('0x12', 98),
              operatorIndex: 1,
              index: 1,
              used: true,
            },
            {
              depositSignature: hexZeroPad('0x13', 194),
              key: hexZeroPad('0x13', 98),
              operatorIndex: 2,
              index: 2,
              used: true,
            },
            {
              depositSignature: hexZeroPad('0x13', 194),
              key: hexZeroPad('0x13', 98),
              operatorIndex: 2,
              index: 3,
              used: false,
            },
          ],
          module: expectedModule(),
        },

        meta: {
          elBlockSnapshot: {
            blockHash: '0x5ba6b9e7cfbbcdd0171f8c2ca5ff08852156e26cf26c722362c63d8c66ac2c15',
            blockNumber: 15819109,
            timestamp: 0,
          },
        },
      });
    });

    test('get module keys on goerli', async () => {
      process.env['CHAIN_ID'] = '5';
      const getKeysWithMetaMock = jest.spyOn(registryService, 'getKeysWithMeta');
      const result = await modulesController.getModuleKeys('0x9D4AF1Ee19Dad8857db3a45B0374c81c8A1C6320', {
        used: true,
        operatorIndex: 1,
      });

      expect(getKeysWithMetaMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).lastCalledWith({ used: true, operatorIndex: 1 });
      expect(result).toEqual({
        data: {
          keys: [
            {
              depositSignature: hexZeroPad('0x12', 194),
              key: hexZeroPad('0x12', 98),
              operatorIndex: 1,
              index: 1,
              used: true,
            },
            {
              depositSignature: hexZeroPad('0x13', 194),
              key: hexZeroPad('0x13', 98),
              operatorIndex: 2,
              index: 2,
              used: true,
            },
            {
              depositSignature: hexZeroPad('0x13', 194),
              key: hexZeroPad('0x13', 98),
              operatorIndex: 2,
              index: 3,
              used: false,
            },
          ],
          module: expectedModule('0x9D4AF1Ee19Dad8857db3a45B0374c81c8A1C6320'),
        },

        meta: {
          elBlockSnapshot: {
            blockHash: '0x5ba6b9e7cfbbcdd0171f8c2ca5ff08852156e26cf26c722362c63d8c66ac2c15',
            blockNumber: 15819109,
            timestamp: 0,
          },
        },
      });
    });

    test('moduleId is SR module id', async () => {
      process.env['CHAIN_ID'] = '1';
      const getKeysWithMetaMock = jest.spyOn(registryService, 'getKeysWithMeta');
      const result = await modulesController.getModuleKeys(1, { used: true, operatorIndex: 1 });

      expect(getKeysWithMetaMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).lastCalledWith({ used: true, operatorIndex: 1 });
      expect(result).toEqual({
        data: {
          keys: [
            {
              depositSignature: hexZeroPad('0x12', 194),
              key: hexZeroPad('0x12', 98),
              operatorIndex: 1,
              index: 1,
              used: true,
            },
            {
              depositSignature: hexZeroPad('0x13', 194),
              key: hexZeroPad('0x13', 98),
              operatorIndex: 2,
              index: 2,
              used: true,
            },
            {
              depositSignature: hexZeroPad('0x13', 194),
              key: hexZeroPad('0x13', 98),
              operatorIndex: 2,
              index: 3,
              used: false,
            },
          ],
          module: expectedModule(),
        },

        meta: {
          elBlockSnapshot: {
            blockHash: '0x5ba6b9e7cfbbcdd0171f8c2ca5ff08852156e26cf26c722362c63d8c66ac2c15',
            blockNumber: 15819109,
            timestamp: 0,
          },
        },
      });
    });

    test('module not found', async () => {
      process.env['CHAIN_ID'] = '1';
      const getKeysWithMetaMock = jest.spyOn(registryService, 'getKeysWithMeta');
      expect(modulesController.getModuleKeys('0x12345', {})).rejects.toThrowError(
        `Module with moduleId 0x12345 is not supported`,
      );
      expect(getKeysWithMetaMock).toBeCalledTimes(0);
    });
  });

  describe('getModuleKeysByPubkeys', () => {
    test('get module keys on mainnet', async () => {
      process.env['CHAIN_ID'] = '1';
      const getKeysWithMetaByPubkeysMock = jest.spyOn(registryService, 'getKeysWithMetaByPubkeys');
      const result = await modulesController.getModuleKeysByPubkeys('0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5', [
        hexZeroPad('0x12', 98),
        hexZeroPad('0x13', 98),
      ]);

      expect(getKeysWithMetaByPubkeysMock).toBeCalledTimes(1);
      expect(getKeysWithMetaByPubkeysMock).lastCalledWith([hexZeroPad('0x12', 98), hexZeroPad('0x13', 98)]);

      expect(result).toEqual({
        data: {
          keys: registryKeys,
          module: expectedModule(),
        },
        meta: {
          elBlockSnapshot: {
            blockHash: '0x5ba6b9e7cfbbcdd0171f8c2ca5ff08852156e26cf26c722362c63d8c66ac2c15',
            blockNumber: 15819109,
            timestamp: 0,
          },
        },
      });
    });

    test('get module keys on goerli', async () => {
      process.env['CHAIN_ID'] = '5';
      const getKeysWithMetaByPubkeysMock = jest.spyOn(registryService, 'getKeysWithMetaByPubkeys');
      const result = await modulesController.getModuleKeysByPubkeys('0x9D4AF1Ee19Dad8857db3a45B0374c81c8A1C6320', [
        hexZeroPad('0x12', 98),
        hexZeroPad('0x13', 98),
      ]);

      expect(getKeysWithMetaByPubkeysMock).toBeCalledTimes(1);
      expect(getKeysWithMetaByPubkeysMock).lastCalledWith([hexZeroPad('0x12', 98), hexZeroPad('0x13', 98)]);

      expect(result).toEqual({
        data: {
          keys: registryKeys,
          module: expectedModule('0x9D4AF1Ee19Dad8857db3a45B0374c81c8A1C6320'),
        },
        meta: {
          elBlockSnapshot: {
            blockHash: '0x5ba6b9e7cfbbcdd0171f8c2ca5ff08852156e26cf26c722362c63d8c66ac2c15',
            blockNumber: 15819109,
            timestamp: 0,
          },
        },
      });
    });

    test('moduleId is a number', async () => {
      const getKeysWithMetaByPubkeysMock = jest.spyOn(registryService, 'getKeysWithMetaByPubkeys');
      const result = await modulesController.getModuleKeysByPubkeys(1, [
        hexZeroPad('0x12', 98),
        hexZeroPad('0x13', 98),
      ]);

      expect(getKeysWithMetaByPubkeysMock).toBeCalledTimes(1);
      expect(getKeysWithMetaByPubkeysMock).lastCalledWith([hexZeroPad('0x12', 98), hexZeroPad('0x13', 98)]);

      expect(result).toEqual({
        data: {
          keys: registryKeys,
          module: expectedModule(),
        },
        meta: {
          elBlockSnapshot: {
            blockHash: '0x5ba6b9e7cfbbcdd0171f8c2ca5ff08852156e26cf26c722362c63d8c66ac2c15',
            blockNumber: 15819109,
            timestamp: 0,
          },
        },
      });
    });
    test('module not found', async () => {
      process.env['CHAIN_ID'] = '1';
      const getKeysWithMetaByPubkeysMock = jest.spyOn(registryService, 'getKeysWithMetaByPubkeys');

      expect(
        modulesController.getModuleKeysByPubkeys('0x12345', [hexZeroPad('0x12', 98), hexZeroPad('0x13', 98)]),
      ).rejects.toThrowError(`Module with moduleId 0x12345 is not supported`);
      expect(getKeysWithMetaByPubkeysMock).toBeCalledTimes(0);
    });
  });
});
