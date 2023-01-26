/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test } from '@nestjs/testing';
import { SRModulesKeysController, SRModulesKeysService } from '../../src/http/sr-modules-keys';
import { ConfigService } from '../../src/common/config';
import { hexZeroPad } from '@ethersproject/bytes';
import { RegistryService } from '../../src/jobs/registry.service';
import {
  communityKeys,
  generalKeys,
  communityModuleMainnet,
  communityModuleGoerli,
  elMeta,
  elBlockSnapshot,
} from '../fixtures';

describe('SRModulesKeysController controller', () => {
  let modulesController: SRModulesKeysController;
  let registryService: RegistryService;

  class ConfigServiceMock {
    get(value) {
      return process.env[value];
    }
  }

  class RegistryServiceMock {
    getKeysWithMeta(filters) {
      // in this tests we dont check filters like used keys or keys by operatorIndex
      // fetching data from db and filters check is implemented in registry library
      return Promise.resolve({ keys: communityKeys, meta: elMeta });
    }

    getKeysWithMetaByPubkeys(pubkeys: string[]) {
      return Promise.resolve({ keys: communityKeys, meta: elMeta });
    }
  }

  const OLD_ENV = process.env;

  beforeEach(async () => {
    jest.resetModules();
    process.env = { ...OLD_ENV };

    const moduleRef = await Test.createTestingModule({
      controllers: [SRModulesKeysController],
      providers: [
        SRModulesKeysService,
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

    modulesController = moduleRef.get<SRModulesKeysController>(SRModulesKeysController);
    registryService = moduleRef.get<RegistryService>(RegistryService);
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  describe('getGroupedByModuleKeys', () => {
    test('get all keys on mainnet', async () => {
      process.env['CHAIN_ID'] = '1';

      // this function should
      const getKeysWithMetaMock = jest.spyOn(registryService, 'getKeysWithMeta');
      const result = await modulesController.getGroupedByModuleKeys({ used: true, operatorIndex: 1 });

      expect(getKeysWithMetaMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).lastCalledWith({ used: true, operatorIndex: 1 });
      expect(result).toEqual({
        data: [
          {
            keys: generalKeys,
            module: communityModuleMainnet,
          },
        ],
        meta: {
          elBlockSnapshot,
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
            keys: generalKeys,
            module: communityModuleGoerli,
          },
        ],
        meta: {
          elBlockSnapshot,
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
          keys: communityKeys,
          module: communityModuleMainnet,
        },

        meta: {
          elBlockSnapshot,
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
          keys: communityKeys,
          module: communityModuleGoerli,
        },

        meta: {
          elBlockSnapshot,
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
          keys: communityKeys,
          module: communityModuleMainnet,
        },

        meta: {
          elBlockSnapshot,
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
          keys: communityKeys,
          module: communityModuleMainnet,
        },
        meta: {
          elBlockSnapshot,
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
          keys: communityKeys,
          module: communityModuleGoerli,
        },
        meta: {
          elBlockSnapshot,
        },
      });
    });

    test('moduleId is a number', async () => {
      process.env['CHAIN_ID'] = '1';
      const getKeysWithMetaByPubkeysMock = jest.spyOn(registryService, 'getKeysWithMetaByPubkeys');
      const result = await modulesController.getModuleKeysByPubkeys(1, [
        hexZeroPad('0x12', 98),
        hexZeroPad('0x13', 98),
      ]);

      expect(getKeysWithMetaByPubkeysMock).toBeCalledTimes(1);
      expect(getKeysWithMetaByPubkeysMock).lastCalledWith([hexZeroPad('0x12', 98), hexZeroPad('0x13', 98)]);

      expect(result).toEqual({
        data: {
          keys: communityKeys,
          module: communityModuleMainnet,
        },
        meta: {
          elBlockSnapshot,
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
