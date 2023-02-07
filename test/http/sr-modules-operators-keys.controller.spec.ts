/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test } from '@nestjs/testing';
import {
  SRModulesOperatorsKeysController,
  SRModulesOperatorsKeysService,
} from '../../src/http/sr-modules-operators-keys';
import { RegistryService } from '../../src/jobs/registry.service';
import { ConfigService } from '../../src/common/config';
import {
  curatedOperators,
  expectedOperatorsResponse,
  elMeta,
  curatedModuleMainnet,
  elBlockSnapshot,
  curatedModuleGoerli,
  curatedKeys,
} from '../fixtures';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';

describe('SRModulesOperatorsController', () => {
  let operatorsKeysController: SRModulesOperatorsKeysController;
  let registryService: RegistryService;

  class ConfigServiceMock {
    get(value) {
      return process.env[value];
    }
  }

  class RegistryServiceMock {
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
            warn: jest.fn(),
          }),
        },
      ],
    }).compile();

    operatorsKeysController = moduleRef.get<SRModulesOperatorsKeysController>(SRModulesOperatorsKeysController);
    registryService = moduleRef.get<RegistryService>(RegistryService);
  });

  describe('get', () => {
    test('module not found', () => {
      process.env['CHAIN_ID'] = '1';
      const getDataMock = jest.spyOn(registryService, 'getData');
      expect(operatorsKeysController.getOperatorsKeys('0x12345', {})).rejects.toThrowError(
        `Module with moduleId 0x12345 is not supported`,
      );
      expect(getDataMock).toBeCalledTimes(0);
    });

    test('EL meta is null', async () => {
      process.env['CHAIN_ID'] = '1';
      const getDataMock = jest.spyOn(registryService, 'getData').mockImplementation(() =>
        // In normal situation it is impossible to get null meta and not empty operators and keys
        // but in API we just need to check meta is not null
        Promise.resolve({ operators: expectedOperatorsResponse, keys: curatedKeys, meta: null }),
      );
      const result = await operatorsKeysController.getOperatorsKeys('0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5', {});

      expect(getDataMock).toBeCalledTimes(1);
      expect(getDataMock).lastCalledWith({});
      expect(result).toEqual({
        data: null,
        meta: null,
      });
    });

    test('successfully get data on mainnet', async () => {
      process.env['CHAIN_ID'] = '1';
      const getDataMock = jest.spyOn(registryService, 'getData');
      const result = await operatorsKeysController.getOperatorsKeys('0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5', {
        used: true,
        operatorIndex: 1,
      });

      expect(getDataMock).toBeCalledTimes(1);
      expect(getDataMock).lastCalledWith({
        used: true,
        operatorIndex: 1,
      });
      expect(result).toEqual({
        data: {
          operators: expectedOperatorsResponse,
          keys: curatedKeys,
          module: curatedModuleMainnet,
        },
        meta: {
          elBlockSnapshot,
        },
      });
    });

    test('successfully get data on goerli', async () => {
      process.env['CHAIN_ID'] = '5';
      const getDataMock = jest.spyOn(registryService, 'getData');
      const result = await operatorsKeysController.getOperatorsKeys('0x9D4AF1Ee19Dad8857db3a45B0374c81c8A1C6320', {
        used: true,
        operatorIndex: 1,
      });

      expect(getDataMock).toBeCalledTimes(1);
      expect(getDataMock).lastCalledWith({
        used: true,
        operatorIndex: 1,
      });
      expect(result).toEqual({
        data: {
          operators: expectedOperatorsResponse,
          keys: curatedKeys,
          module: curatedModuleGoerli,
        },
        meta: {
          elBlockSnapshot,
        },
      });
    });

    test('successfully get data by module id is SR module id', async () => {
      process.env['CHAIN_ID'] = '1';
      const getDataMock = jest.spyOn(registryService, 'getData');
      const result = await operatorsKeysController.getOperatorsKeys(1, { used: true, operatorIndex: 1 });

      expect(getDataMock).toBeCalledTimes(1);
      expect(getDataMock).lastCalledWith({
        used: true,
        operatorIndex: 1,
      });
      expect(result).toEqual({
        data: {
          operators: expectedOperatorsResponse,
          keys: curatedKeys,
          module: curatedModuleMainnet,
        },
        meta: {
          elBlockSnapshot,
        },
      });
    });

    test('successfully get data without filters', async () => {
      process.env['CHAIN_ID'] = '1';
      const getDataMock = jest.spyOn(registryService, 'getData');
      const result = await operatorsKeysController.getOperatorsKeys(1, {});

      expect(getDataMock).toBeCalledTimes(1);
      expect(getDataMock).lastCalledWith({});
      expect(result).toEqual({
        data: {
          operators: expectedOperatorsResponse,
          keys: curatedKeys,
          module: curatedModuleMainnet,
        },
        meta: {
          elBlockSnapshot,
        },
      });
    });
  });
});
