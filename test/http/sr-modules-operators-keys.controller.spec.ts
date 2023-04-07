/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test } from '@nestjs/testing';
import { SRModulesOperatorsKeysController, SRModulesOperatorsKeysService } from 'http/sr-modules-operators-keys';
import { KeysUpdateService } from 'jobs/keys-update';
import { ConfigService } from 'common/config';
import {
  curatedOperators,
  expectedOperatorsResponse,
  elMeta,
  curatedModuleMainnet,
  elBlockSnapshot,
  curatedModuleGoerli,
  curatedKeys,
  stakingModulesMainnet,
  curatedModuleGoerliResponse,
  curatedModuleMainnetResponse,
} from '../fixtures';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { CuratedModuleService } from 'staking-router-modules';
import { ModuleId } from 'http/common/entities';

describe('SRModulesOperatorsController', () => {
  let operatorsKeysController: SRModulesOperatorsKeysController;
  let keysUpdateService: KeysUpdateService;
  let curatedModuleService: CuratedModuleService;

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
    getData(filters) {
      return Promise.resolve({ operators: curatedOperators, keys: curatedKeys, meta: elMeta });
    }
  }

  const OLD_ENV = process.env;

  beforeEach(async () => {
    jest.resetModules();
    process.env = { ...OLD_ENV };

    const moduleRef = await Test.createTestingModule({
      controllers: [SRModulesOperatorsKeysController],
      providers: [
        SRModulesOperatorsKeysService,
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

    operatorsKeysController = moduleRef.get<SRModulesOperatorsKeysController>(SRModulesOperatorsKeysController);
    keysUpdateService = moduleRef.get<KeysUpdateService>(KeysUpdateService);
    curatedModuleService = moduleRef.get<CuratedModuleService>(CuratedModuleService);
  });

  describe('get', () => {
    test('module not found', async () => {
      process.env['CHAIN_ID'] = '1';
      const getDataMock = jest.spyOn(curatedModuleService, 'getData');
      const getStakingModuleMock = jest
        .spyOn(keysUpdateService, 'getStakingModule')
        .mockImplementation(() => undefined);

      await expect(operatorsKeysController.getOperatorsKeys('0x12345', {})).rejects.toThrowError(
        `Module with moduleId 0x12345 is not supported`,
      );
      expect(getStakingModuleMock).toBeCalledTimes(1);
      expect(getDataMock).toBeCalledTimes(0);
    });

    test('EL meta is null', async () => {
      process.env['CHAIN_ID'] = '1';
      const getDataMock = jest.spyOn(curatedModuleService, 'getData').mockImplementation(() =>
        // In normal situation it is impossible to get null meta and not empty operators and keys
        // but in API we just need to check meta is not null
        Promise.resolve({ operators: expectedOperatorsResponse, keys: curatedKeys, meta: null }),
      );
      const getStakingModuleMock = jest.spyOn(keysUpdateService, 'getStakingModule');
      await expect(
        operatorsKeysController.getOperatorsKeys('0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5', {}),
      ).rejects.toThrowError('Too early response');

      expect(getDataMock).toBeCalledTimes(1);
      expect(getDataMock).lastCalledWith({});
      expect(getStakingModuleMock).toBeCalledTimes(1);
    });

    test('successfully get data on mainnet', async () => {
      process.env['CHAIN_ID'] = '1';
      const getDataMock = jest.spyOn(curatedModuleService, 'getData');
      const getStakingModuleMock = jest.spyOn(keysUpdateService, 'getStakingModule');
      const result = await operatorsKeysController.getOperatorsKeys('0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5', {
        used: true,
        operatorIndex: 1,
      });

      expect(getDataMock).toBeCalledTimes(1);
      expect(getDataMock).lastCalledWith({
        used: true,
        operatorIndex: 1,
      });
      expect(getStakingModuleMock).toBeCalledTimes(1);
      expect(result).toEqual({
        data: {
          operators: expectedOperatorsResponse,
          keys: curatedKeys,
          module: curatedModuleMainnetResponse,
        },
        meta: {
          elBlockSnapshot,
        },
      });
    });

    test('successfully get data on goerli', async () => {
      process.env['CHAIN_ID'] = '5';
      const getDataMock = jest.spyOn(curatedModuleService, 'getData');
      const getStakingModuleMock = jest
        .spyOn(keysUpdateService, 'getStakingModule')
        .mockImplementation(() => curatedModuleGoerli);
      const result = await operatorsKeysController.getOperatorsKeys('0x9D4AF1Ee19Dad8857db3a45B0374c81c8A1C6320', {
        used: true,
        operatorIndex: 1,
      });

      expect(getDataMock).toBeCalledTimes(1);
      expect(getDataMock).lastCalledWith({
        used: true,
        operatorIndex: 1,
      });
      expect(getStakingModuleMock).toBeCalledTimes(1);
      expect(result).toEqual({
        data: {
          operators: expectedOperatorsResponse,
          keys: curatedKeys,
          module: curatedModuleGoerliResponse,
        },
        meta: {
          elBlockSnapshot,
        },
      });
    });

    test('successfully get data by module id, module is is SR module id', async () => {
      process.env['CHAIN_ID'] = '1';
      const getDataMock = jest.spyOn(curatedModuleService, 'getData');
      const getStakingModuleMock = jest.spyOn(keysUpdateService, 'getStakingModule');
      const result = await operatorsKeysController.getOperatorsKeys(1, { used: true, operatorIndex: 1 });

      expect(getDataMock).toBeCalledTimes(1);
      expect(getDataMock).lastCalledWith({
        used: true,
        operatorIndex: 1,
      });
      expect(getStakingModuleMock).toBeCalledTimes(1);
      expect(result).toEqual({
        data: {
          operators: expectedOperatorsResponse,
          keys: curatedKeys,
          module: curatedModuleMainnetResponse,
        },
        meta: {
          elBlockSnapshot,
        },
      });
    });

    test('successfully get data without filters', async () => {
      process.env['CHAIN_ID'] = '1';
      const getDataMock = jest.spyOn(curatedModuleService, 'getData');
      const getStakingModuleMock = jest.spyOn(keysUpdateService, 'getStakingModule');
      const result = await operatorsKeysController.getOperatorsKeys(1, {});

      expect(getDataMock).toBeCalledTimes(1);
      expect(getDataMock).lastCalledWith({});
      expect(getStakingModuleMock).toBeCalledTimes(1);
      expect(result).toEqual({
        data: {
          operators: expectedOperatorsResponse,
          keys: curatedKeys,
          module: curatedModuleMainnetResponse,
        },
        meta: {
          elBlockSnapshot,
        },
      });
    });
  });
});
