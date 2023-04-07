/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test } from '@nestjs/testing';
import { SRModulesKeysController, SRModulesKeysService } from 'http/sr-modules-keys';
import { ConfigService } from 'common/config';
import { hexZeroPad } from '@ethersproject/bytes';
import { KeysUpdateService } from 'jobs/keys-update/';
import { CuratedModuleService } from 'staking-router-modules';
import {
  curatedKeys,
  keysInGeneralForm,
  curatedModuleMainnet,
  curatedModuleGoerli,
  elMeta,
  elBlockSnapshot,
  stakingModulesMainnet,
  stakingModulesGoerli,
  curatedModuleMainnetResponse,
  curatedModuleGoerliResponse,
} from '../fixtures';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { ModuleId } from 'http/common/entities';
import { StakingModule } from 'common/contracts';

describe('SRModulesKeysController controller', () => {
  let moduleKeysController: SRModulesKeysController;
  let curatedModuleService: CuratedModuleService;
  let keysUpdateService: KeysUpdateService;

  class ConfigServiceMock {
    get(value) {
      return process.env[value];
    }
  }

  class KeysUpdateServiceMock {
    getStakingModules() {
      return stakingModulesMainnet;
    }

    getStakingModule(moduleId: ModuleId) {
      return curatedModuleMainnet;
    }
  }

  class CuratedModuleServiceMock {
    getKeysWithMeta(filters) {
      // in this tests we dont check filters like used keys or keys by operatorIndex
      // fetching data from db and filters check is implemented in registry library
      return Promise.resolve({ keys: curatedKeys, meta: elMeta });
    }

    getKeysWithMetaByPubkeys(pubkeys: string[]) {
      return Promise.resolve({ keys: curatedKeys, meta: elMeta });
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
          provide: CuratedModuleService,
          useClass: CuratedModuleServiceMock,
        },
        {
          provide: KeysUpdateService,
          useClass: KeysUpdateServiceMock,
        },
        {
          provide: ConfigService,
          useClass: ConfigServiceMock,
        },
        {
          provide: LOGGER_PROVIDER,
          useFactory: () => ({
            log: jest.fn(),
            warn: jest.fn(),
          }),
        },
      ],
    }).compile();

    moduleKeysController = moduleRef.get<SRModulesKeysController>(SRModulesKeysController);
    curatedModuleService = moduleRef.get<CuratedModuleService>(CuratedModuleService);
    keysUpdateService = moduleRef.get<KeysUpdateService>(KeysUpdateService);
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  describe('getGroupedByModuleKeys', () => {
    test('get all keys on mainnet', async () => {
      process.env['CHAIN_ID'] = '1';

      // this function should
      const getKeysWithMetaMock = jest.spyOn(curatedModuleService, 'getKeysWithMeta');
      const getStakingModulesMock = jest.spyOn(keysUpdateService, 'getStakingModules');
      const result = await moduleKeysController.getGroupedByModuleKeys({ used: true, operatorIndex: 1 });

      expect(getKeysWithMetaMock).toBeCalledTimes(1);
      expect(getStakingModulesMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).lastCalledWith({ used: true, operatorIndex: 1 });
      expect(result).toEqual({
        data: [
          {
            keys: keysInGeneralForm,
            module: curatedModuleMainnetResponse,
          },
        ],
        meta: {
          elBlockSnapshot,
        },
      });
    });

    test('get all keys on goerli', async () => {
      process.env['CHAIN_ID'] = '5';
      const getKeysWithMetaMock = jest.spyOn(curatedModuleService, 'getKeysWithMeta');
      const getStakingModulesMock = jest
        .spyOn(keysUpdateService, 'getStakingModules')
        .mockImplementation(() => stakingModulesGoerli);
      const result = await moduleKeysController.getGroupedByModuleKeys({ used: true, operatorIndex: 1 });

      expect(getKeysWithMetaMock).toBeCalledTimes(1);
      expect(getStakingModulesMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).lastCalledWith({ used: true, operatorIndex: 1 });
      expect(result).toEqual({
        data: [
          {
            keys: keysInGeneralForm,
            module: curatedModuleGoerliResponse,
          },
        ],
        meta: {
          elBlockSnapshot,
        },
      });
    });

    test('EL meta is null', async () => {
      process.env['CHAIN_ID'] = '1';

      const getKeysWithMetaMock = jest
        .spyOn(curatedModuleService, 'getKeysWithMeta')
        .mockImplementation(() => Promise.resolve({ keys: [], meta: null }));
      const getStakingModulesMock = jest.spyOn(keysUpdateService, 'getStakingModules');
      await expect(moduleKeysController.getGroupedByModuleKeys({ used: true, operatorIndex: 1 })).rejects.toThrowError(
        'Too early response',
      );

      expect(getStakingModulesMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).toBeCalledWith({ used: true, operatorIndex: 1 });
    });

    test('Staking Modules list is empty', async () => {
      const getStakingModulesMock = jest.spyOn(keysUpdateService, 'getStakingModules').mockImplementation(() => []);
      const getKeysWithMetaMock = jest.spyOn(curatedModuleService, 'getKeysWithMeta');
      await expect(moduleKeysController.getGroupedByModuleKeys({ used: true, operatorIndex: 1 })).rejects.toThrowError(
        'Too early response',
      );

      expect(getStakingModulesMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).toBeCalledTimes(0);
    });

    test('Staking Modules list contain only unknown modules', async () => {
      const unknownType: any = 'unknown-address';
      const unknownModule: StakingModule = { ...curatedModuleMainnet, type: unknownType };
      const getStakingModulesMock = jest
        .spyOn(keysUpdateService, 'getStakingModules')
        .mockImplementation(() => [unknownModule]);
      const getKeysWithMetaMock = jest.spyOn(curatedModuleService, 'getKeysWithMeta');

      await expect(moduleKeysController.getGroupedByModuleKeys({ used: true, operatorIndex: 1 })).rejects.toThrowError(
        'Too early response',
      );

      expect(getStakingModulesMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).toBeCalledTimes(0);
    });
  });

  describe('getModuleKeys', () => {
    test('get module keys on mainnet', async () => {
      process.env['CHAIN_ID'] = '1';
      const getKeysWithMetaMock = jest.spyOn(curatedModuleService, 'getKeysWithMeta');
      const getStakingModuleMock = jest
        .spyOn(keysUpdateService, 'getStakingModule')
        .mockImplementation(() => curatedModuleMainnet);
      const result = await moduleKeysController.getModuleKeys('0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5', {
        used: true,
        operatorIndex: 1,
      });

      expect(getKeysWithMetaMock).toBeCalledTimes(1);
      expect(getStakingModuleMock).toBeCalledTimes(1);
      expect(getStakingModuleMock).toBeCalledWith('0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5');
      expect(getKeysWithMetaMock).lastCalledWith({ used: true, operatorIndex: 1 });
      expect(result).toEqual({
        data: {
          keys: curatedKeys,
          module: curatedModuleMainnetResponse,
        },
        meta: {
          elBlockSnapshot,
        },
      });
    });

    test('get module keys on goerli', async () => {
      process.env['CHAIN_ID'] = '5';
      const getKeysWithMetaMock = jest.spyOn(curatedModuleService, 'getKeysWithMeta');
      const getStakingModuleMock = jest
        .spyOn(keysUpdateService, 'getStakingModule')
        .mockImplementation(() => curatedModuleGoerli);
      const result = await moduleKeysController.getModuleKeys('0x9D4AF1Ee19Dad8857db3a45B0374c81c8A1C6320', {
        used: true,
        operatorIndex: 1,
      });

      expect(getKeysWithMetaMock).toBeCalledTimes(1);
      expect(getStakingModuleMock).toBeCalledTimes(1);
      expect(getStakingModuleMock).toBeCalledWith('0x9D4AF1Ee19Dad8857db3a45B0374c81c8A1C6320');
      expect(getKeysWithMetaMock).lastCalledWith({ used: true, operatorIndex: 1 });
      expect(result).toEqual({
        data: {
          keys: curatedKeys,
          module: curatedModuleGoerliResponse,
        },

        meta: {
          elBlockSnapshot,
        },
      });
    });

    test('moduleId is SR module id', async () => {
      process.env['CHAIN_ID'] = '1';
      const getKeysWithMetaMock = jest.spyOn(curatedModuleService, 'getKeysWithMeta');
      const getStakingModuleMock = jest
        .spyOn(keysUpdateService, 'getStakingModule')
        .mockImplementation(() => curatedModuleMainnet);
      const result = await moduleKeysController.getModuleKeys(1, { used: true, operatorIndex: 1 });

      expect(getKeysWithMetaMock).toBeCalledTimes(1);
      expect(getStakingModuleMock).toBeCalledTimes(1);
      expect(getStakingModuleMock).toBeCalledWith(1);
      expect(getKeysWithMetaMock).lastCalledWith({ used: true, operatorIndex: 1 });
      expect(result).toEqual({
        data: {
          keys: curatedKeys,
          module: curatedModuleMainnetResponse,
        },

        meta: {
          elBlockSnapshot,
        },
      });
    });

    test('module not found', async () => {
      process.env['CHAIN_ID'] = '1';
      const getKeysWithMetaMock = jest.spyOn(curatedModuleService, 'getKeysWithMeta');
      const getStakingModuleMock = jest
        .spyOn(keysUpdateService, 'getStakingModule')
        .mockImplementation(() => undefined);
      await expect(moduleKeysController.getModuleKeys('0x12345', {})).rejects.toThrowError(
        `Module with moduleId 0x12345 is not supported`,
      );
      expect(getStakingModuleMock).toBeCalledTimes(1);
      expect(getStakingModuleMock).toBeCalledWith('0x12345');
      expect(getKeysWithMetaMock).toBeCalledTimes(0);
    });

    test('EL meta is null', async () => {
      process.env['CHAIN_ID'] = '1';

      const getKeysWithMetaMock = jest
        .spyOn(curatedModuleService, 'getKeysWithMeta')
        .mockImplementation(() => Promise.resolve({ keys: [], meta: null }));
      const getStakingModuleMock = jest
        .spyOn(keysUpdateService, 'getStakingModule')
        .mockImplementation(() => curatedModuleMainnet);

      await expect(
        moduleKeysController.getModuleKeys('0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5', {
          used: true,
          operatorIndex: 1,
        }),
      ).rejects.toThrowError('Too early response');

      expect(getStakingModuleMock).toBeCalledTimes(1);
      expect(getStakingModuleMock).toBeCalledWith('0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5');
      expect(getKeysWithMetaMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).toBeCalledWith({ used: true, operatorIndex: 1 });
    });
  });

  describe('getModuleKeysByPubkeys', () => {
    test('get module keys on mainnet', async () => {
      process.env['CHAIN_ID'] = '1';
      const getKeysWithMetaByPubkeysMock = jest.spyOn(curatedModuleService, 'getKeysWithMetaByPubkeys');
      const getStakingModuleMock = jest
        .spyOn(keysUpdateService, 'getStakingModule')
        .mockImplementation(() => curatedModuleMainnet);
      const result = await moduleKeysController.getModuleKeysByPubkeys('0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5', {
        pubkeys: [hexZeroPad('0x12', 98), hexZeroPad('0x13', 98)],
      });

      expect(getKeysWithMetaByPubkeysMock).toBeCalledTimes(1);
      expect(getKeysWithMetaByPubkeysMock).lastCalledWith([hexZeroPad('0x12', 98), hexZeroPad('0x13', 98)]);
      expect(getStakingModuleMock).toBeCalledTimes(1);
      expect(getStakingModuleMock).toBeCalledWith('0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5');
      expect(result).toEqual({
        data: {
          keys: curatedKeys,
          module: curatedModuleMainnetResponse,
        },
        meta: {
          elBlockSnapshot,
        },
      });
    });

    test('get module keys on goerli', async () => {
      process.env['CHAIN_ID'] = '5';
      const getKeysWithMetaByPubkeysMock = jest.spyOn(curatedModuleService, 'getKeysWithMetaByPubkeys');
      const getStakingModuleMock = jest
        .spyOn(keysUpdateService, 'getStakingModule')
        .mockImplementation(() => curatedModuleGoerli);
      const result = await moduleKeysController.getModuleKeysByPubkeys('0x9D4AF1Ee19Dad8857db3a45B0374c81c8A1C6320', {
        pubkeys: [hexZeroPad('0x12', 98), hexZeroPad('0x13', 98)],
      });

      expect(getKeysWithMetaByPubkeysMock).toBeCalledTimes(1);
      expect(getKeysWithMetaByPubkeysMock).lastCalledWith([hexZeroPad('0x12', 98), hexZeroPad('0x13', 98)]);
      expect(getStakingModuleMock).toBeCalledTimes(1);
      expect(getStakingModuleMock).toBeCalledWith('0x9D4AF1Ee19Dad8857db3a45B0374c81c8A1C6320');
      expect(result).toEqual({
        data: {
          keys: curatedKeys,
          module: curatedModuleGoerliResponse,
        },
        meta: {
          elBlockSnapshot,
        },
      });
    });

    test('moduleId is a number', async () => {
      process.env['CHAIN_ID'] = '1';
      const getKeysWithMetaByPubkeysMock = jest.spyOn(curatedModuleService, 'getKeysWithMetaByPubkeys');
      const getStakingModuleMock = jest
        .spyOn(keysUpdateService, 'getStakingModule')
        .mockImplementation(() => curatedModuleMainnet);
      const result = await moduleKeysController.getModuleKeysByPubkeys(1, {
        pubkeys: [hexZeroPad('0x12', 98), hexZeroPad('0x13', 98)],
      });

      expect(getKeysWithMetaByPubkeysMock).toBeCalledTimes(1);
      expect(getKeysWithMetaByPubkeysMock).lastCalledWith([hexZeroPad('0x12', 98), hexZeroPad('0x13', 98)]);
      expect(getStakingModuleMock).toBeCalledTimes(1);
      expect(getStakingModuleMock).toBeCalledWith(1);
      expect(result).toEqual({
        data: {
          keys: curatedKeys,
          module: curatedModuleMainnetResponse,
        },
        meta: {
          elBlockSnapshot,
        },
      });
    });

    test('module not found', async () => {
      process.env['CHAIN_ID'] = '1';
      const getKeysWithMetaByPubkeysMock = jest.spyOn(curatedModuleService, 'getKeysWithMetaByPubkeys');
      const getStakingModuleMock = jest
        .spyOn(keysUpdateService, 'getStakingModule')
        .mockImplementation(() => undefined);

      await expect(
        moduleKeysController.getModuleKeysByPubkeys('0x12345', {
          pubkeys: [hexZeroPad('0x12', 98), hexZeroPad('0x13', 98)],
        }),
      ).rejects.toThrowError(`Module with moduleId 0x12345 is not supported`);
      expect(getKeysWithMetaByPubkeysMock).toBeCalledTimes(0);
      expect(getStakingModuleMock).toBeCalledTimes(1);
      expect(getStakingModuleMock).toBeCalledWith('0x12345');
    });

    test('EL meta is null', async () => {
      process.env['CHAIN_ID'] = '1';

      const getKeysWithMetaByPubkeysMock = jest
        .spyOn(curatedModuleService, 'getKeysWithMetaByPubkeys')
        .mockImplementation(() => Promise.resolve({ keys: [], meta: null }));
      const getStakingModuleMock = jest
        .spyOn(keysUpdateService, 'getStakingModule')
        .mockImplementation(() => curatedModuleMainnet);
      await expect(
        moduleKeysController.getModuleKeysByPubkeys(1, {
          pubkeys: [hexZeroPad('0x12', 98), hexZeroPad('0x13', 98)],
        }),
      ).rejects.toThrowError('Too early response');

      expect(getKeysWithMetaByPubkeysMock).toBeCalledTimes(1);
      expect(getKeysWithMetaByPubkeysMock).lastCalledWith([hexZeroPad('0x12', 98), hexZeroPad('0x13', 98)]);
      expect(getStakingModuleMock).toBeCalledTimes(1);
      expect(getStakingModuleMock).toBeCalledWith(1);
    });
  });
});
