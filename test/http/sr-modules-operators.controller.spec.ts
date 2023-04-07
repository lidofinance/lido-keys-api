/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test } from '@nestjs/testing';
import { SRModulesOperatorsController, SRModulesOperatorsService } from '../../src/http/sr-modules-operators';
import { KeysUpdateService } from 'jobs/keys-update';
import { ConfigService } from 'common/config';
import {
  curatedOperators,
  expectedOperatorsResponse,
  elMeta,
  curatedModuleMainnet,
  elBlockSnapshot,
  curatedModuleGoerli,
  curatedOperatorIndexOne,
  expectedOperatorIndexOne,
  stakingModulesMainnet,
  stakingModulesGoerli,
  curatedModuleGoerliResponse,
  curatedModuleMainnetResponse,
} from '../fixtures';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { ModuleId } from 'http/common/entities';
import { CuratedModuleService } from 'staking-router-modules';
import { StakingModule } from 'common/contracts';

describe('SRModulesOperatorsController', () => {
  let operatorsController: SRModulesOperatorsController;
  let keysUpdateService: KeysUpdateService;
  let curatedModuleService: CuratedModuleService;

  class ConfigServiceMock {
    get(value) {
      return process.env[value];
    }
  }

  class CuratedModuleServiceMock {
    getOperatorsWithMeta(filters) {
      return Promise.resolve({ operators: curatedOperators, meta: elMeta });
    }

    getOperatorByIndex(index) {
      return Promise.resolve({ operator: curatedOperatorIndexOne, meta: elMeta });
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

  const OLD_ENV = process.env;

  beforeEach(async () => {
    jest.resetModules();
    process.env = { ...OLD_ENV };

    const moduleRef = await Test.createTestingModule({
      controllers: [SRModulesOperatorsController],
      providers: [
        SRModulesOperatorsService,
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

    operatorsController = moduleRef.get<SRModulesOperatorsController>(SRModulesOperatorsController);
    keysUpdateService = moduleRef.get<KeysUpdateService>(KeysUpdateService);
    curatedModuleService = moduleRef.get<CuratedModuleService>(CuratedModuleService);
  });

  describe('get', () => {
    test('get all operators on mainnet', async () => {
      process.env['CHAIN_ID'] = '1';
      const getOperatorsWithMock = jest.spyOn(curatedModuleService, 'getOperatorsWithMeta');
      const getStakingModulesMock = jest.spyOn(keysUpdateService, 'getStakingModules');
      const result = await operatorsController.get();

      expect(getOperatorsWithMock).toBeCalledTimes(1);
      expect(getStakingModulesMock).toBeCalledTimes(1);
      expect(getOperatorsWithMock).lastCalledWith();
      expect(result).toEqual({
        data: [
          {
            operators: expectedOperatorsResponse,
            module: curatedModuleMainnetResponse,
          },
        ],
        meta: {
          elBlockSnapshot,
        },
      });
    });

    test('get all operators on goerli', async () => {
      process.env['CHAIN_ID'] = '5';
      const getOperatorsWithMock = jest.spyOn(curatedModuleService, 'getOperatorsWithMeta');
      const getStakingModulesMock = jest
        .spyOn(keysUpdateService, 'getStakingModules')
        .mockImplementation(() => stakingModulesGoerli);
      const result = await operatorsController.get();

      expect(getOperatorsWithMock).toBeCalledTimes(1);
      expect(getStakingModulesMock).toBeCalledTimes(1);
      expect(getOperatorsWithMock).lastCalledWith();
      expect(result).toEqual({
        data: [
          {
            operators: expectedOperatorsResponse,
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
      const getOperatorsWithMock = jest
        .spyOn(curatedModuleService, 'getOperatorsWithMeta')
        .mockImplementation(() => Promise.resolve({ operators: curatedOperators, meta: null }));
      const getStakingModulesMock = jest.spyOn(keysUpdateService, 'getStakingModules');
      await expect(operatorsController.get()).rejects.toThrowError('Too early response');

      expect(getOperatorsWithMock).toBeCalledTimes(1);
      expect(getStakingModulesMock).toBeCalledTimes(1);
      expect(getOperatorsWithMock).lastCalledWith();
      // expect(result).toEqual({
      //   data: [],
      //   meta: null,
      // });
    });

    test('Staking Modules list is empty', async () => {
      const getStakingModulesMock = jest.spyOn(keysUpdateService, 'getStakingModules').mockImplementation(() => []);
      const getOperatorsWithMock = jest.spyOn(curatedModuleService, 'getOperatorsWithMeta');
      await expect(operatorsController.get()).rejects.toThrowError('Too early response');

      expect(getStakingModulesMock).toBeCalledTimes(1);
      expect(getOperatorsWithMock).toBeCalledTimes(0);
    });

    test('Staking Modules list contain only unknown modules', async () => {
      const unknownType: any = 'unknown-address';
      const unknownModule: StakingModule = { ...curatedModuleMainnet, type: unknownType };
      const getStakingModulesMock = jest
        .spyOn(keysUpdateService, 'getStakingModules')
        .mockImplementation(() => [unknownModule]);
      const getOperatorsWithMock = jest.spyOn(curatedModuleService, 'getOperatorsWithMeta');

      await expect(operatorsController.get()).rejects.toThrowError('Too early response');

      expect(getStakingModulesMock).toBeCalledTimes(1);
      expect(getOperatorsWithMock).toBeCalledTimes(0);
    });
  });

  describe('getModuleOperators', () => {
    test('get module operators on mainnet', async () => {
      process.env['CHAIN_ID'] = '1';
      const getOperatorsWithMock = jest.spyOn(curatedModuleService, 'getOperatorsWithMeta');
      const getStakingModuleMock = jest.spyOn(keysUpdateService, 'getStakingModule');
      const result = await operatorsController.getModuleOperators('0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5');

      expect(getOperatorsWithMock).toBeCalledTimes(1);
      expect(getStakingModuleMock).toBeCalledTimes(1);
      expect(getOperatorsWithMock).lastCalledWith();
      expect(result).toEqual({
        data: {
          operators: expectedOperatorsResponse,
          module: curatedModuleMainnetResponse,
        },
        meta: {
          elBlockSnapshot,
        },
      });
    });

    test('get module operators on goerli', async () => {
      process.env['CHAIN_ID'] = '5';
      const getOperatorsWithMock = jest.spyOn(curatedModuleService, 'getOperatorsWithMeta');
      const getStakingModuleMock = jest
        .spyOn(keysUpdateService, 'getStakingModule')
        .mockImplementation(() => curatedModuleGoerli);
      const result = await operatorsController.getModuleOperators('0x9D4AF1Ee19Dad8857db3a45B0374c81c8A1C6320');

      expect(getOperatorsWithMock).toBeCalledTimes(1);
      expect(getStakingModuleMock).toBeCalledTimes(1);
      expect(getOperatorsWithMock).lastCalledWith();
      expect(result).toEqual({
        data: {
          operators: expectedOperatorsResponse,
          module: curatedModuleGoerliResponse,
        },
        meta: {
          elBlockSnapshot,
        },
      });
    });

    test('EL meta is null', async () => {
      process.env['CHAIN_ID'] = '1';
      const getOperatorsWithMock = jest
        .spyOn(curatedModuleService, 'getOperatorsWithMeta')
        .mockImplementation(() => Promise.resolve({ operators: curatedOperators, meta: null }));
      const getStakingModuleMock = jest.spyOn(keysUpdateService, 'getStakingModule');
      await expect(
        operatorsController.getModuleOperators('0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5'),
      ).rejects.toThrowError('Too early response');

      expect(getOperatorsWithMock).toBeCalledTimes(1);
      expect(getStakingModuleMock).toBeCalledTimes(1);
      expect(getOperatorsWithMock).lastCalledWith();
    });

    test('module not found', async () => {
      process.env['CHAIN_ID'] = '1';
      const getOperatorsWithMock = jest.spyOn(curatedModuleService, 'getOperatorsWithMeta');
      const getStakingModuleMock = jest
        .spyOn(keysUpdateService, 'getStakingModule')
        .mockImplementation(() => undefined);

      await expect(operatorsController.getModuleOperators('0x12345')).rejects.toThrowError(
        `Module with moduleId 0x12345 is not supported`,
      );
      expect(getStakingModuleMock).toBeCalledTimes(1);
      expect(getOperatorsWithMock).toBeCalledTimes(0);
    });

    test('moduleId is SR module', async () => {
      process.env['CHAIN_ID'] = '1';
      const getOperatorsWithMock = jest.spyOn(curatedModuleService, 'getOperatorsWithMeta');
      const getStakingModuleMock = jest.spyOn(keysUpdateService, 'getStakingModule');
      // in all other tests we used address
      const result = await operatorsController.getModuleOperators(1);

      expect(getOperatorsWithMock).toBeCalledTimes(1);
      expect(getStakingModuleMock).toBeCalledTimes(1);
      expect(getOperatorsWithMock).lastCalledWith();
      expect(result).toEqual({
        data: {
          operators: expectedOperatorsResponse,
          module: curatedModuleMainnetResponse,
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
      const getOperatorByIndexMock = jest.spyOn(curatedModuleService, 'getOperatorByIndex');
      const getStakingModuleMock = jest.spyOn(keysUpdateService, 'getStakingModule');
      const result = await operatorsController.getModuleOperator('0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5', {
        operator_id: 1,
      });
      expect(getOperatorByIndexMock).toBeCalledTimes(1);
      expect(getStakingModuleMock).toBeCalledTimes(1);
      expect(getOperatorByIndexMock).lastCalledWith(1);
      expect(result).toEqual({
        data: {
          operator: expectedOperatorIndexOne,
          module: curatedModuleMainnetResponse,
        },
        meta: {
          elBlockSnapshot,
        },
      });
    });

    test('get module operator on goerli', async () => {
      process.env['CHAIN_ID'] = '5';
      const getOperatorByIndexMock = jest.spyOn(curatedModuleService, 'getOperatorByIndex');
      const getStakingModuleMock = jest
        .spyOn(keysUpdateService, 'getStakingModule')
        .mockImplementation(() => curatedModuleGoerli);
      const result = await operatorsController.getModuleOperator('0x9D4AF1Ee19Dad8857db3a45B0374c81c8A1C6320', {
        operator_id: 1,
      });
      expect(getOperatorByIndexMock).toBeCalledTimes(1);
      expect(getStakingModuleMock).toBeCalledTimes(1);
      expect(getOperatorByIndexMock).lastCalledWith(1);
      expect(result).toEqual({
        data: {
          operator: expectedOperatorIndexOne,
          module: curatedModuleGoerliResponse,
        },
        meta: {
          elBlockSnapshot,
        },
      });
    });

    test('module not found', async () => {
      process.env['CHAIN_ID'] = '1';
      const getOperatorByIndexMock = jest.spyOn(curatedModuleService, 'getOperatorByIndex');
      const getStakingModuleMock = jest
        .spyOn(keysUpdateService, 'getStakingModule')
        .mockImplementation(() => undefined);

      await expect(operatorsController.getModuleOperator('0x12345', { operator_id: 1 })).rejects.toThrowError(
        `Module with moduleId 0x12345 is not supported`,
      );
      expect(getStakingModuleMock).toBeCalledTimes(1);
      expect(getOperatorByIndexMock).toBeCalledTimes(0);
    });

    test('EL meta is null', async () => {
      process.env['CHAIN_ID'] = '1';
      const getOperatorByIndexMock = jest
        .spyOn(curatedModuleService, 'getOperatorByIndex')
        .mockImplementation(() => Promise.resolve({ operator: curatedOperatorIndexOne, meta: null }));
      const getStakingModuleMock = jest.spyOn(keysUpdateService, 'getStakingModule');
      await expect(
        operatorsController.getModuleOperator('0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5', {
          operator_id: 1,
        }),
      ).rejects.toThrowError('Too early response');

      expect(getOperatorByIndexMock).toBeCalledTimes(1);
      expect(getStakingModuleMock).toBeCalledTimes(1);
      expect(getOperatorByIndexMock).lastCalledWith(1);
    });

    test('operator is not found error', async () => {
      process.env['CHAIN_ID'] = '1';
      const getOperatorByIndexMock = jest
        .spyOn(curatedModuleService, 'getOperatorByIndex')
        .mockImplementation(() => Promise.resolve({ operator: null, meta: elMeta }));
      const getStakingModuleMock = jest.spyOn(keysUpdateService, 'getStakingModule');

      await expect(
        operatorsController.getModuleOperator('0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5', { operator_id: 1 }),
      ).rejects.toThrowError(
        'Operator with index 1 is not found for module with moduleId 0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5',
      );

      expect(getOperatorByIndexMock).toBeCalledTimes(1);
      expect(getOperatorByIndexMock).lastCalledWith(1);
      expect(getStakingModuleMock).toBeCalledTimes(1);
    });
  });
});
