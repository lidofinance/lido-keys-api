/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test } from '@nestjs/testing';
import { SRModulesOperatorsController, SRModulesOperatorsService } from '../../src/http/sr-modules-operators';
import { RegistryService } from '../../src/jobs/registry.service';
import { ConfigService } from '../../src/common/config';
import {
  curatedOperators,
  expectedOperatorsResponse,
  elMeta,
  curatedModuleMainnet,
  elBlockSnapshot,
  curatedModuleGoerli,
  curatedOperatorIndexOne,
  expectedOperatorIndexOne,
} from '../fixtures';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';

describe('SRModulesOperatorsController', () => {
  let operatorsController: SRModulesOperatorsController;
  let registryService: RegistryService;

  class ConfigServiceMock {
    get(value) {
      return process.env[value];
    }
  }

  class RegistryServiceMock {
    getOperatorsWithMeta(filters) {
      return Promise.resolve({ operators: curatedOperators, meta: elMeta });
    }

    getOperatorByIndex(index) {
      return Promise.resolve({ operator: curatedOperatorIndexOne, meta: elMeta });
    }
  }

  const OLD_ENV = process.env;

  beforeEach(async () => {
    jest.resetModules();
    process.env = { ...OLD_ENV };

    const moduleRef = await Test.createTestingModule({
      controllers: [SRModulesOperatorsController],
      providers: [
        SRModulesOperatorsService,
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

    operatorsController = moduleRef.get<SRModulesOperatorsController>(SRModulesOperatorsController);
    registryService = moduleRef.get<RegistryService>(RegistryService);
  });

  describe('get', () => {
    test('get all operators on mainnet', async () => {
      process.env['CHAIN_ID'] = '1';
      const getOperatorsWithMock = jest.spyOn(registryService, 'getOperatorsWithMeta');
      const result = await operatorsController.get();

      expect(getOperatorsWithMock).toBeCalledTimes(1);
      expect(getOperatorsWithMock).lastCalledWith();
      expect(result).toEqual({
        data: [
          {
            operators: expectedOperatorsResponse,
            module: curatedModuleMainnet,
          },
        ],
        meta: {
          elBlockSnapshot,
        },
      });
    });

    test('get all operators on goerli', async () => {
      process.env['CHAIN_ID'] = '5';
      const getOperatorsWithMock = jest.spyOn(registryService, 'getOperatorsWithMeta');
      const result = await operatorsController.get();

      expect(getOperatorsWithMock).toBeCalledTimes(1);
      expect(getOperatorsWithMock).lastCalledWith();
      expect(result).toEqual({
        data: [
          {
            operators: expectedOperatorsResponse,
            module: curatedModuleGoerli,
          },
        ],
        meta: {
          elBlockSnapshot,
        },
      });
    });

    test('EL meta is null', async () => {
      process.env['CHAIN_ID'] = '1';
      const getOperatorsWithMock = jest
        .spyOn(registryService, 'getOperatorsWithMeta')
        .mockImplementation(() => Promise.resolve({ operators: curatedOperators, meta: null }));
      const result = await operatorsController.get();

      expect(getOperatorsWithMock).toBeCalledTimes(1);
      expect(getOperatorsWithMock).lastCalledWith();
      expect(result).toEqual({
        data: [],
        meta: null,
      });
    });
  });

  describe('getModuleOperators', () => {
    test('get module operators on mainnet', async () => {
      process.env['CHAIN_ID'] = '1';
      const getOperatorsWithMock = jest.spyOn(registryService, 'getOperatorsWithMeta');
      const result = await operatorsController.getModuleOperators('0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5');

      expect(getOperatorsWithMock).toBeCalledTimes(1);
      expect(getOperatorsWithMock).lastCalledWith();
      expect(result).toEqual({
        data: {
          operators: expectedOperatorsResponse,
          module: curatedModuleMainnet,
        },
        meta: {
          elBlockSnapshot,
        },
      });
    });

    test('get module operators on goerli', async () => {
      process.env['CHAIN_ID'] = '5';
      const getOperatorsWithMock = jest.spyOn(registryService, 'getOperatorsWithMeta');
      const result = await operatorsController.getModuleOperators('0x9D4AF1Ee19Dad8857db3a45B0374c81c8A1C6320');

      expect(getOperatorsWithMock).toBeCalledTimes(1);
      expect(getOperatorsWithMock).lastCalledWith();
      expect(result).toEqual({
        data: {
          operators: expectedOperatorsResponse,
          module: curatedModuleGoerli,
        },
        meta: {
          elBlockSnapshot,
        },
      });
    });

    test('EL meta is null', async () => {
      process.env['CHAIN_ID'] = '1';
      const getOperatorsWithMock = jest
        .spyOn(registryService, 'getOperatorsWithMeta')
        .mockImplementation(() => Promise.resolve({ operators: curatedOperators, meta: null }));
      const result = await operatorsController.getModuleOperators('0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5');

      expect(getOperatorsWithMock).toBeCalledTimes(1);
      expect(getOperatorsWithMock).lastCalledWith();
      expect(result).toEqual({
        data: null,
        meta: null,
      });
    });

    test('module not found', async () => {
      process.env['CHAIN_ID'] = '1';
      const getOperatorsWithMock = jest.spyOn(registryService, 'getOperatorsWithMeta');
      expect(operatorsController.getModuleOperators('0x12345')).rejects.toThrowError(
        `Module with moduleId 0x12345 is not supported`,
      );
      expect(getOperatorsWithMock).toBeCalledTimes(0);
    });

    test('moduleId is SR module is', async () => {
      process.env['CHAIN_ID'] = '1';
      const getOperatorsWithMock = jest.spyOn(registryService, 'getOperatorsWithMeta');
      // in all other tests we used address
      const result = await operatorsController.getModuleOperators(1);

      expect(getOperatorsWithMock).toBeCalledTimes(1);
      expect(getOperatorsWithMock).lastCalledWith();
      expect(result).toEqual({
        data: {
          operators: expectedOperatorsResponse,
          module: curatedModuleMainnet,
        },
        meta: {
          elBlockSnapshot,
        },
      });
    });
  });

  describe('getModuleOperator', () => {
    test('get module operator on mainnet', async () => {
      process.env['CHAIN_ID'] = '1';
      const getOperatorByIndexMock = jest.spyOn(registryService, 'getOperatorByIndex');
      const result = await operatorsController.getModuleOperator('0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5', 1);
      expect(getOperatorByIndexMock).toBeCalledTimes(1);
      expect(getOperatorByIndexMock).lastCalledWith(1);
      expect(result).toEqual({
        data: {
          operator: expectedOperatorIndexOne,
          module: curatedModuleMainnet,
        },
        meta: {
          elBlockSnapshot,
        },
      });
    });

    test('get module operator on goerli', async () => {
      process.env['CHAIN_ID'] = '5';
      const getOperatorByIndexMock = jest.spyOn(registryService, 'getOperatorByIndex');
      const result = await operatorsController.getModuleOperator('0x9D4AF1Ee19Dad8857db3a45B0374c81c8A1C6320', 1);
      expect(getOperatorByIndexMock).toBeCalledTimes(1);
      expect(getOperatorByIndexMock).lastCalledWith(1);
      expect(result).toEqual({
        data: {
          operator: expectedOperatorIndexOne,
          module: curatedModuleGoerli,
        },
        meta: {
          elBlockSnapshot,
        },
      });
    });

    test('module not found', async () => {
      process.env['CHAIN_ID'] = '1';
      const getOperatorByIndexMock = jest.spyOn(registryService, 'getOperatorByIndex');
      expect(operatorsController.getModuleOperator('0x12345', 1)).rejects.toThrowError(
        `Module with moduleId 0x12345 is not supported`,
      );
      expect(getOperatorByIndexMock).toBeCalledTimes(0);
    });

    test('EL meta is null', async () => {
      process.env['CHAIN_ID'] = '1';
      const getOperatorByIndexMock = jest
        .spyOn(registryService, 'getOperatorByIndex')
        .mockImplementation(() => Promise.resolve({ operator: curatedOperatorIndexOne, meta: null }));
      const result = await operatorsController.getModuleOperator('0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5', 1);

      expect(getOperatorByIndexMock).toBeCalledTimes(1);
      expect(getOperatorByIndexMock).lastCalledWith(1);
      expect(result).toEqual({
        data: null,
        meta: null,
      });
    });

    test('operator is not found error', async () => {
      process.env['CHAIN_ID'] = '1';
      const getOperatorByIndexMock = jest
        .spyOn(registryService, 'getOperatorByIndex')
        .mockImplementation(() => Promise.resolve({ operator: null, meta: elMeta }));

      await expect(
        operatorsController.getModuleOperator('0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5', 1),
      ).rejects.toThrowError(
        'Operator with index 1 is not found for module with moduleId 0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5',
      );

      expect(getOperatorByIndexMock).toBeCalledTimes(1);
      expect(getOperatorByIndexMock).lastCalledWith(1);
    });
  });
});
