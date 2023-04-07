/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test } from '@nestjs/testing';
import { SRModulesValidatorsController, SRModulesValidatorsService } from 'http/sr-modules-validators';
import { toBoolean, ConfigService } from 'common/config';
import { KeysUpdateService } from 'jobs/keys-update';
import { ValidatorsService } from 'validators';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import {
  elMeta,
  elMetaNotSynced,
  clMeta,
  clBlockSnapshot,
  stakingModulesMainnet,
  curatedModuleMainnet,
} from '../fixtures';
import { operatorOneUsedKeys } from '../fixtures';
import { operatorOneValidatorsToExit, operatorOnePresignMessageList, operatorOneValidatorsExitList } from '../fixtures';
import { ValidatorStatus } from '@lido-nestjs/validators-registry';
import { CuratedModuleService } from 'staking-router-modules/';
import { ModuleId } from 'http/common/entities';

const VALIDATORS_TO_EXIT_STATUSES = [
  ValidatorStatus.ACTIVE_ONGOING,
  ValidatorStatus.PENDING_INITIALIZED,
  ValidatorStatus.PENDING_QUEUED,
];

describe('SRModulesValidators controller', () => {
  let validatorsController: SRModulesValidatorsController;
  let validatorsService: ValidatorsService;
  let curatedModuleService: CuratedModuleService;
  let keysUpdateService: KeysUpdateService;

  class ConfigServiceMock {
    get(value) {
      if (value == 'VALIDATOR_REGISTRY_ENABLE') {
        return toBoolean(process.env[value]);
      }
      return process.env[value];
    }
  }

  class KeysUpdateServiceMock {
    getStakingModule(moduleId: ModuleId) {
      return curatedModuleMainnet;
    }
  }

  class CuratedModuleServiceMock {
    getKeysWithMeta(filters) {
      return jest.fn();
    }
  }
  class ValidatorsServiceMock {
    getOldestValidators(filters) {
      return jest.fn();
    }
  }

  const OLD_ENV = process.env;

  beforeEach(async () => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
    process.env['VALIDATOR_REGISTRY_ENABLE'] = 'true';

    const moduleRef = await Test.createTestingModule({
      controllers: [SRModulesValidatorsController],
      providers: [
        SRModulesValidatorsService,
        {
          provide: KeysUpdateService,
          useClass: KeysUpdateServiceMock,
        },
        {
          provide: CuratedModuleService,
          useClass: CuratedModuleServiceMock,
        },
        {
          provide: ValidatorsService,
          useClass: ValidatorsServiceMock,
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

    validatorsController = moduleRef.get<SRModulesValidatorsController>(SRModulesValidatorsController);
    keysUpdateService = moduleRef.get<KeysUpdateService>(KeysUpdateService);
    curatedModuleService = moduleRef.get<CuratedModuleService>(CuratedModuleService);
    validatorsService = moduleRef.get<ValidatorsService>(ValidatorsService);
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  describe('getOldestValidators', () => {
    test('module not found', async () => {
      process.env['CHAIN_ID'] = '1';

      const getKeysWithMetaMock = jest.spyOn(curatedModuleService, 'getKeysWithMeta');
      const getStakingModuleMock = jest
        .spyOn(keysUpdateService, 'getStakingModule')
        .mockImplementation(() => undefined);
      const getValidatorsMock = jest.spyOn(validatorsService, 'getOldestValidators');

      await expect(validatorsController.getOldestValidators('0x12345', { operator_id: 1 }, {})).rejects.toThrowError(
        `Module with moduleId 0x12345 is not supported`,
      );
      expect(getStakingModuleMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).toBeCalledTimes(0);
      expect(getValidatorsMock).toBeCalledTimes(0);
    });

    test('EL meta is actual, set 10 percent if percent or max_amount are not provided', async () => {
      process.env['CHAIN_ID'] = '1';

      // return used keys

      const getKeysWithMetaMock = jest
        .spyOn(curatedModuleService, 'getKeysWithMeta')
        .mockImplementation(() => Promise.resolve({ keys: operatorOneUsedKeys, meta: elMeta }));
      const getStakingModuleMock = jest.spyOn(keysUpdateService, 'getStakingModule');

      // return validators by pubkeys
      const getValidatorsMock = jest
        .spyOn(validatorsService, 'getOldestValidators')
        .mockImplementation(() => Promise.resolve({ validators: operatorOneValidatorsToExit, meta: clMeta }));

      const res = await validatorsController.getOldestValidators(
        '0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5',
        { operator_id: 1 },
        {},
      );

      expect(res).toEqual({
        data: operatorOneValidatorsExitList,
        meta: { clBlockSnapshot: clBlockSnapshot },
      });

      expect(getKeysWithMetaMock).toBeCalledTimes(1);
      expect(getStakingModuleMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).toBeCalledWith({ used: true, operatorIndex: 1 });
      expect(getValidatorsMock).toBeCalledTimes(1);
      expect(getValidatorsMock).toBeCalledWith({
        pubkeys: operatorOneUsedKeys.map((k) => k.key),
        statuses: VALIDATORS_TO_EXIT_STATUSES,
        max_amount: undefined,
        percent: 10,
      });
    });

    test('EL meta is not actual', async () => {
      process.env['CHAIN_ID'] = '1';

      // return used keys
      const getKeysWithMetaMock = jest
        .spyOn(curatedModuleService, 'getKeysWithMeta')
        .mockImplementation(() => Promise.resolve({ keys: operatorOneUsedKeys, meta: elMetaNotSynced }));
      const getStakingModuleMock = jest.spyOn(keysUpdateService, 'getStakingModule');

      // return validators by pubkeys
      const getValidatorsMock = jest
        .spyOn(validatorsService, 'getOldestValidators')
        .mockImplementation(() => Promise.resolve({ validators: operatorOneValidatorsToExit, meta: clMeta }));

      await expect(
        validatorsController.getOldestValidators('0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5', { operator_id: 1 }, {}),
      ).rejects.toThrowError('Last Execution Layer block number in our database older than last Consensus Layer');
      expect(getStakingModuleMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).toBeCalledWith({ used: true, operatorIndex: 1 });
      expect(getValidatorsMock).toBeCalledTimes(1);
      expect(getValidatorsMock).toBeCalledWith({
        pubkeys: operatorOneUsedKeys.map((k) => k.key),
        statuses: VALIDATORS_TO_EXIT_STATUSES,
        max_amount: undefined,
        percent: 10,
      });
    });

    test('EL meta is null', async () => {
      process.env['CHAIN_ID'] = '1';

      const getKeysWithMetaMock = jest
        .spyOn(curatedModuleService, 'getKeysWithMeta')
        .mockImplementation(() => Promise.resolve({ keys: [], meta: null }));
      const getValidatorsMock = jest.spyOn(validatorsService, 'getOldestValidators');
      const getStakingModuleMock = jest.spyOn(keysUpdateService, 'getStakingModule');

      await expect(
        validatorsController.getOldestValidators('0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5', { operator_id: 1 }, {}),
      ).rejects.toThrowError('Too early response');

      expect(getStakingModuleMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).toBeCalledWith({ used: true, operatorIndex: 1 });
      expect(getValidatorsMock).toBeCalledTimes(0);
    });

    test('CL meta is null', async () => {
      process.env['CHAIN_ID'] = '1';

      // return used keys

      const getKeysWithMetaMock = jest
        .spyOn(curatedModuleService, 'getKeysWithMeta')
        .mockImplementation(() => Promise.resolve({ keys: operatorOneUsedKeys, meta: elMeta }));
      const getStakingModuleMock = jest.spyOn(keysUpdateService, 'getStakingModule');
      const getValidatorsMock = jest
        .spyOn(validatorsService, 'getOldestValidators')
        .mockImplementation(() => Promise.resolve({ validators: [], meta: null }));

      await expect(
        validatorsController.getOldestValidators('0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5', { operator_id: 1 }, {}),
      ).rejects.toThrowError('Too early response');

      expect(getStakingModuleMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).toBeCalledWith({ used: true, operatorIndex: 1 });
      expect(getValidatorsMock).toBeCalledTimes(1);
      expect(getValidatorsMock).toBeCalledWith({
        pubkeys: operatorOneUsedKeys.map((k) => k.key),
        statuses: VALIDATORS_TO_EXIT_STATUSES,
        max_amount: undefined,
        percent: 10,
      });
    });

    test('if max_amount is provided, dont set default percent', async () => {
      process.env['CHAIN_ID'] = '1';

      // return used keys
      const getKeysWithMetaMock = jest
        .spyOn(curatedModuleService, 'getKeysWithMeta')
        .mockImplementation(() => Promise.resolve({ keys: operatorOneUsedKeys, meta: elMeta }));
      const getStakingModuleMock = jest.spyOn(keysUpdateService, 'getStakingModule');
      // return validators by pubkeys
      const getValidatorsMock = jest
        .spyOn(validatorsService, 'getOldestValidators')
        .mockImplementation(() => Promise.resolve({ validators: operatorOneValidatorsToExit, meta: clMeta }));

      const res = await validatorsController.getOldestValidators(
        '0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5',
        { operator_id: 1 },
        {
          max_amount: 100,
        },
      );

      expect(res).toEqual({
        data: operatorOneValidatorsExitList,
        meta: { clBlockSnapshot: clBlockSnapshot },
      });

      expect(getStakingModuleMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).toBeCalledWith({ used: true, operatorIndex: 1 });
      expect(getValidatorsMock).toBeCalledTimes(1);
      expect(getValidatorsMock).toBeCalledWith({
        pubkeys: operatorOneUsedKeys.map((k) => k.key),
        statuses: VALIDATORS_TO_EXIT_STATUSES,
        max_amount: 100,
        percent: undefined,
      });
    });

    test('if percent is provided , not set default  percent', async () => {
      process.env['CHAIN_ID'] = '1';

      // return used keys
      const getKeysWithMetaMock = jest
        .spyOn(curatedModuleService, 'getKeysWithMeta')
        .mockImplementation(() => Promise.resolve({ keys: operatorOneUsedKeys, meta: elMeta }));
      const getStakingModuleMock = jest.spyOn(keysUpdateService, 'getStakingModule');
      // return validators by pubkeys
      const getValidatorsMock = jest
        .spyOn(validatorsService, 'getOldestValidators')
        .mockImplementation(() => Promise.resolve({ validators: operatorOneValidatorsToExit, meta: clMeta }));

      const res = await validatorsController.getOldestValidators(
        '0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5',
        { operator_id: 1 },
        {
          percent: 100,
        },
      );

      expect(res).toEqual({
        data: operatorOneValidatorsExitList,
        meta: { clBlockSnapshot: clBlockSnapshot },
      });
      expect(getStakingModuleMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).toBeCalledWith({ used: true, operatorIndex: 1 });
      expect(getValidatorsMock).toBeCalledTimes(1);
      expect(getValidatorsMock).toBeCalledWith({
        pubkeys: operatorOneUsedKeys.map((k) => k.key),
        statuses: VALIDATORS_TO_EXIT_STATUSES,
        max_amount: undefined,
        percent: 100,
      });
    });

    test('percent and max_amount parameters are provided', async () => {
      process.env['CHAIN_ID'] = '1';

      // return used keys
      const getKeysWithMetaMock = jest
        .spyOn(curatedModuleService, 'getKeysWithMeta')
        .mockImplementation(() => Promise.resolve({ keys: operatorOneUsedKeys, meta: elMeta }));
      const getStakingModuleMock = jest.spyOn(keysUpdateService, 'getStakingModule');
      // return validators by pubkeys
      const getValidatorsMock = jest
        .spyOn(validatorsService, 'getOldestValidators')
        .mockImplementation(() => Promise.resolve({ validators: operatorOneValidatorsToExit, meta: clMeta }));

      const res = await validatorsController.getOldestValidators(
        '0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5',
        { operator_id: 1 },
        {
          percent: 100,
          max_amount: 100,
        },
      );

      expect(res).toEqual({
        data: operatorOneValidatorsExitList,
        meta: { clBlockSnapshot: clBlockSnapshot },
      });
      expect(getStakingModuleMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).toBeCalledWith({ used: true, operatorIndex: 1 });
      expect(getValidatorsMock).toBeCalledTimes(1);
      expect(getValidatorsMock).toBeCalledWith({
        pubkeys: operatorOneUsedKeys.map((k) => k.key),
        statuses: VALIDATORS_TO_EXIT_STATUSES,
        max_amount: 100,
        percent: 100,
      });
    });

    test('validators registry is disabled', async () => {
      process.env['CHAIN_ID'] = '1';
      process.env['VALIDATOR_REGISTRY_ENABLE'] = 'false';

      // return used keys
      const getKeysWithMetaMock = jest.spyOn(curatedModuleService, 'getKeysWithMeta');
      // in api this method should return null in case of VALIDATOR_REGISTRY_ENABLE = 'false'
      // but here we are interested in check this env in controller methods and relevant error
      const getValidatorsMock = jest.spyOn(validatorsService, 'getOldestValidators');
      const getStakingModuleMock = jest.spyOn(keysUpdateService, 'getStakingModule');

      await expect(
        validatorsController.getOldestValidators(
          '0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5',
          { operator_id: 1 },
          {
            percent: 100,
            max_amount: 100,
          },
        ),
      ).rejects.toThrowError('Validators Registry is disabled. Check environment variables');
      expect(getStakingModuleMock).toBeCalledTimes(0);
      expect(getKeysWithMetaMock).toBeCalledTimes(0);
      expect(getValidatorsMock).toBeCalledTimes(0);
    });
  });

  describe('getMessagesForOldestValidators', () => {
    test('module not found', async () => {
      process.env['CHAIN_ID'] = '1';

      const getKeysWithMetaMock = jest.spyOn(curatedModuleService, 'getKeysWithMeta');
      const getValidatorsMock = jest.spyOn(validatorsService, 'getOldestValidators');
      const getStakingModuleMock = jest
        .spyOn(keysUpdateService, 'getStakingModule')
        .mockImplementation(() => undefined);

      await expect(
        validatorsController.getMessagesForOldestValidators('0x12345', { operator_id: 1 }, {}),
      ).rejects.toThrowError(`Module with moduleId 0x12345 is not supported`);
      expect(getStakingModuleMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).toBeCalledTimes(0);
      expect(getValidatorsMock).toBeCalledTimes(0);
    });

    test('EL meta is actual, set percent if percent or max_amount are not provided', async () => {
      process.env['CHAIN_ID'] = '1';

      // return used keys
      const getKeysWithMetaMock = jest
        .spyOn(curatedModuleService, 'getKeysWithMeta')
        .mockImplementation(() => Promise.resolve({ keys: operatorOneUsedKeys, meta: elMeta }));
      const getStakingModuleMock = jest.spyOn(keysUpdateService, 'getStakingModule');

      // return validators by pubkeys
      const getValidatorsMock = jest
        .spyOn(validatorsService, 'getOldestValidators')
        .mockImplementation(() => Promise.resolve({ validators: operatorOneValidatorsToExit, meta: clMeta }));

      const res = await validatorsController.getMessagesForOldestValidators(
        '0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5',
        { operator_id: 1 },
        {},
      );

      expect(res).toEqual({
        data: operatorOnePresignMessageList,
        meta: { clBlockSnapshot: clBlockSnapshot },
      });
      expect(getStakingModuleMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).toBeCalledWith({ used: true, operatorIndex: 1 });
      expect(getValidatorsMock).toBeCalledTimes(1);
      expect(getValidatorsMock).toBeCalledWith({
        pubkeys: operatorOneUsedKeys.map((k) => k.key),
        statuses: VALIDATORS_TO_EXIT_STATUSES,
        max_amount: undefined,
        percent: 10,
      });
    });

    test('EL meta is not actual', async () => {
      process.env['CHAIN_ID'] = '1';

      // return used keys
      const getKeysWithMetaMock = jest
        .spyOn(curatedModuleService, 'getKeysWithMeta')
        .mockImplementation(() => Promise.resolve({ keys: operatorOneUsedKeys, meta: elMetaNotSynced }));
      const getStakingModuleMock = jest.spyOn(keysUpdateService, 'getStakingModule');

      // return validators by pubkeys
      const getValidatorsMock = jest
        .spyOn(validatorsService, 'getOldestValidators')
        .mockImplementation(() => Promise.resolve({ validators: operatorOneValidatorsToExit, meta: clMeta }));

      await expect(
        validatorsController.getMessagesForOldestValidators(
          '0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5',
          { operator_id: 1 },
          {},
        ),
      ).rejects.toThrowError('Last Execution Layer block number in our database older than last Consensus Layer');
      expect(getStakingModuleMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).toBeCalledWith({ used: true, operatorIndex: 1 });
      expect(getValidatorsMock).toBeCalledTimes(1);
      expect(getValidatorsMock).toBeCalledWith({
        pubkeys: operatorOneUsedKeys.map((k) => k.key),
        statuses: VALIDATORS_TO_EXIT_STATUSES,
        max_amount: undefined,
        percent: 10,
      });
    });

    test('EL meta is null', async () => {
      process.env['CHAIN_ID'] = '1';

      const getKeysWithMetaMock = jest
        .spyOn(curatedModuleService, 'getKeysWithMeta')
        .mockImplementation(() => Promise.resolve({ keys: [], meta: null }));
      const getValidatorsMock = jest.spyOn(validatorsService, 'getOldestValidators');
      const getStakingModuleMock = jest.spyOn(keysUpdateService, 'getStakingModule');
      await expect(
        validatorsController.getMessagesForOldestValidators(
          '0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5',
          { operator_id: 1 },
          {},
        ),
      ).rejects.toThrowError('Too early response');
      expect(getStakingModuleMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).toBeCalledWith({ used: true, operatorIndex: 1 });
      expect(getValidatorsMock).toBeCalledTimes(0);
    });

    test('CL meta is null', async () => {
      process.env['CHAIN_ID'] = '1';

      // return used keys

      const getKeysWithMetaMock = jest
        .spyOn(curatedModuleService, 'getKeysWithMeta')
        .mockImplementation(() => Promise.resolve({ keys: operatorOneUsedKeys, meta: elMeta }));
      const getStakingModuleMock = jest.spyOn(keysUpdateService, 'getStakingModule');
      const getValidatorsMock = jest
        .spyOn(validatorsService, 'getOldestValidators')
        .mockImplementation(() => Promise.resolve({ validators: [], meta: null }));

      await expect(
        validatorsController.getMessagesForOldestValidators(
          '0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5',
          { operator_id: 1 },
          {},
        ),
      ).rejects.toThrowError('Too early response');
      expect(getStakingModuleMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).toBeCalledWith({ used: true, operatorIndex: 1 });
      expect(getValidatorsMock).toBeCalledTimes(1);
      expect(getValidatorsMock).toBeCalledWith({
        pubkeys: operatorOneUsedKeys.map((k) => k.key),
        statuses: VALIDATORS_TO_EXIT_STATUSES,
        max_amount: undefined,
        percent: 10,
      });
    });

    test('if max_amount is provided, dont set default percent', async () => {
      process.env['CHAIN_ID'] = '1';

      // return used keys
      const getKeysWithMetaMock = jest
        .spyOn(curatedModuleService, 'getKeysWithMeta')
        .mockImplementation(() => Promise.resolve({ keys: operatorOneUsedKeys, meta: elMeta }));
      const getStakingModuleMock = jest.spyOn(keysUpdateService, 'getStakingModule');
      // return validators by pubkeys
      const getValidatorsMock = jest
        .spyOn(validatorsService, 'getOldestValidators')
        .mockImplementation(() => Promise.resolve({ validators: operatorOneValidatorsToExit, meta: clMeta }));

      const res = await validatorsController.getMessagesForOldestValidators(
        '0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5',
        { operator_id: 1 },
        {
          max_amount: 100,
        },
      );

      expect(res).toEqual({
        data: operatorOnePresignMessageList,
        meta: { clBlockSnapshot: clBlockSnapshot },
      });
      expect(getStakingModuleMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).toBeCalledWith({ used: true, operatorIndex: 1 });
      expect(getValidatorsMock).toBeCalledTimes(1);
      expect(getValidatorsMock).toBeCalledWith({
        pubkeys: operatorOneUsedKeys.map((k) => k.key),
        statuses: VALIDATORS_TO_EXIT_STATUSES,
        max_amount: 100,
        percent: undefined,
      });
    });

    test('if percent is provided, not set default  percent', async () => {
      process.env['CHAIN_ID'] = '1';

      // return used keys
      const getKeysWithMetaMock = jest
        .spyOn(curatedModuleService, 'getKeysWithMeta')
        .mockImplementation(() => Promise.resolve({ keys: operatorOneUsedKeys, meta: elMeta }));
      const getStakingModuleMock = jest.spyOn(keysUpdateService, 'getStakingModule');
      // return validators by pubkeys
      const getValidatorsMock = jest
        .spyOn(validatorsService, 'getOldestValidators')
        .mockImplementation(() => Promise.resolve({ validators: operatorOneValidatorsToExit, meta: clMeta }));

      const res = await validatorsController.getMessagesForOldestValidators(
        '0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5',
        { operator_id: 1 },
        {
          percent: 100,
        },
      );

      expect(res).toEqual({
        data: operatorOnePresignMessageList,
        meta: { clBlockSnapshot: clBlockSnapshot },
      });
      expect(getStakingModuleMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).toBeCalledWith({ used: true, operatorIndex: 1 });
      expect(getValidatorsMock).toBeCalledTimes(1);
      expect(getValidatorsMock).toBeCalledWith({
        pubkeys: operatorOneUsedKeys.map((k) => k.key),
        statuses: VALIDATORS_TO_EXIT_STATUSES,
        max_amount: undefined,
        percent: 100,
      });
    });

    test('percent and max_amount parameters are provided', async () => {
      process.env['CHAIN_ID'] = '1';

      // return used keys
      const getKeysWithMetaMock = jest
        .spyOn(curatedModuleService, 'getKeysWithMeta')
        .mockImplementation(() => Promise.resolve({ keys: operatorOneUsedKeys, meta: elMeta }));
      const getStakingModuleMock = jest.spyOn(keysUpdateService, 'getStakingModule');
      // return validators by pubkeys
      const getValidatorsMock = jest
        .spyOn(validatorsService, 'getOldestValidators')
        .mockImplementation(() => Promise.resolve({ validators: operatorOneValidatorsToExit, meta: clMeta }));

      const res = await validatorsController.getMessagesForOldestValidators(
        '0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5',
        { operator_id: 1 },
        {
          percent: 100,
          max_amount: 100,
        },
      );

      expect(res).toEqual({
        data: operatorOnePresignMessageList,
        meta: { clBlockSnapshot: clBlockSnapshot },
      });
      expect(getStakingModuleMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).toBeCalledWith({ used: true, operatorIndex: 1 });
      expect(getValidatorsMock).toBeCalledTimes(1);
      expect(getValidatorsMock).toBeCalledWith({
        pubkeys: operatorOneUsedKeys.map((k) => k.key),
        statuses: VALIDATORS_TO_EXIT_STATUSES,
        max_amount: 100,
        percent: 100,
      });
    });

    test('validators registry is disabled', async () => {
      process.env['CHAIN_ID'] = '1';
      process.env['VALIDATOR_REGISTRY_ENABLE'] = 'false';

      // return used keys
      const getKeysWithMetaMock = jest.spyOn(curatedModuleService, 'getKeysWithMeta');
      const getStakingModuleMock = jest.spyOn(keysUpdateService, 'getStakingModule');
      // in api this method should return null in case of VALIDATOR_REGISTRY_ENABLE = 'false'
      // but here we are interested in check this env in controller methods and relevant error
      const getValidatorsMock = jest.spyOn(validatorsService, 'getOldestValidators');

      await expect(
        validatorsController.getMessagesForOldestValidators(
          '0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5',
          { operator_id: 1 },
          {
            percent: 100,
            max_amount: 100,
          },
        ),
      ).rejects.toThrowError('Validators Registry is disabled. Check environment variables');
      expect(getStakingModuleMock).toBeCalledTimes(0);
      expect(getKeysWithMetaMock).toBeCalledTimes(0);
      expect(getValidatorsMock).toBeCalledTimes(0);
    });
  });
});
