/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test } from '@nestjs/testing';
import { SRModulesController, SRModulesService } from 'http/sr-modules';
import { ConfigService } from 'common/config';
import {
  elMeta,
  elBlockSnapshot,
  stakingModulesMainnet,
  stakingModulesGoerli,
  stakingModulesMainnetResponse,
  stakingModulesGoerliResponse,
  curatedModuleMainnet,
  curatedModuleGoerli,
  curatedModuleMainnetResponse,
  curatedModuleGoerliResponse,
} from '../fixtures';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { KeysUpdateService } from 'jobs/keys-update/keys-update.service';
import { CuratedModuleService } from 'staking-router-modules/';
import { ModuleId } from 'http/common/entities';
import { StakingModule } from 'common/contracts';

describe('SRModules controller', () => {
  let modulesController: SRModulesController;
  let curatedModuleService: CuratedModuleService;
  let keysUpdateService: KeysUpdateService;

  class ConfigServiceMock {
    get(value) {
      return process.env[value];
    }
  }

  class CuratedModuleServiceMock {
    getMetaDataFromStorage() {
      return Promise.resolve(elMeta);
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
      controllers: [SRModulesController],
      providers: [
        SRModulesService,
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

    modulesController = moduleRef.get<SRModulesController>(SRModulesController);
    curatedModuleService = moduleRef.get<CuratedModuleService>(CuratedModuleService);
    keysUpdateService = moduleRef.get<KeysUpdateService>(KeysUpdateService);
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  describe('getModules', () => {
    test('modules on mainnet', async () => {
      process.env['CHAIN_ID'] = '1';
      const getMetaDataFromStorageMock = jest.spyOn(curatedModuleService, 'getMetaDataFromStorage');
      const getStakingModulesMock = jest.spyOn(keysUpdateService, 'getStakingModules');
      const result = await modulesController.getModules();

      expect(getMetaDataFromStorageMock).toBeCalledTimes(1);
      expect(getStakingModulesMock).toBeCalledTimes(1);
      expect(result).toEqual({
        data: stakingModulesMainnetResponse,
        elBlockSnapshot,
      });
    });

    test('modules on goerli', async () => {
      process.env['CHAIN_ID'] = '5';
      const getMetaDataFromStorageMock = jest.spyOn(curatedModuleService, 'getMetaDataFromStorage');
      const getStakingModulesMock = jest
        .spyOn(keysUpdateService, 'getStakingModules')
        .mockImplementation(() => stakingModulesGoerli);
      const result = await modulesController.getModules();

      expect(getMetaDataFromStorageMock).toBeCalledTimes(1);
      expect(getStakingModulesMock).toBeCalledTimes(1);
      expect(result).toEqual({
        data: stakingModulesGoerliResponse,
        elBlockSnapshot,
      });
    });

    test('Staking Modules list is empty', async () => {
      const getStakingModulesMock = jest.spyOn(keysUpdateService, 'getStakingModules').mockImplementation(() => []);
      const getMetaDataFromStorageMock = jest.spyOn(curatedModuleService, 'getMetaDataFromStorage');
      const result = await modulesController.getModules();

      expect(result).toEqual({ data: [], elBlockSnapshot: null });
      expect(getStakingModulesMock).toBeCalledTimes(1);
      expect(getMetaDataFromStorageMock).toBeCalledTimes(0);
    });

    test('Staking Modules list contains only unknown modules', async () => {
      const unknownType: any = 'unknown-address';
      const unknownModule: StakingModule = { ...curatedModuleMainnet, type: unknownType };
      const getStakingModulesMock = jest
        .spyOn(keysUpdateService, 'getStakingModules')
        .mockImplementation(() => [unknownModule]);
      const getMetaDataFromStorageMock = jest.spyOn(curatedModuleService, 'getMetaDataFromStorage');

      const result = await modulesController.getModules();

      expect(result).toEqual({ data: [], elBlockSnapshot: null });
      expect(getStakingModulesMock).toBeCalledTimes(1);
      expect(getMetaDataFromStorageMock).toBeCalledTimes(0);
    });
  });

  describe('getModule', () => {
    test('module on mainnet', async () => {
      process.env['CHAIN_ID'] = '1';
      const getMetaDataFromStorageMock = jest.spyOn(curatedModuleService, 'getMetaDataFromStorage');
      const getStakingModuleMock = jest.spyOn(keysUpdateService, 'getStakingModule');
      const result = await modulesController.getModule('0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5');

      expect(getMetaDataFromStorageMock).toBeCalledTimes(1);
      expect(getStakingModuleMock).toBeCalledTimes(1);
      expect(result).toEqual({
        data: curatedModuleMainnetResponse,
        elBlockSnapshot,
      });
    });

    test('module on goerli', async () => {
      process.env['CHAIN_ID'] = '5';
      const getMetaDataFromStorageMock = jest.spyOn(curatedModuleService, 'getMetaDataFromStorage');
      const getStakingModuleMock = jest
        .spyOn(keysUpdateService, 'getStakingModule')
        .mockImplementation(() => curatedModuleGoerli);
      const result = await modulesController.getModule('0x9D4AF1Ee19Dad8857db3a45B0374c81c8A1C6320');

      expect(getMetaDataFromStorageMock).toBeCalledTimes(1);
      expect(getStakingModuleMock).toBeCalledTimes(1);
      expect(result).toEqual({
        data: curatedModuleGoerliResponse,
        elBlockSnapshot,
      });
    });

    test('module not found', async () => {
      process.env['CHAIN_ID'] = '1';
      const getMetaDataFromStorageMock = jest.spyOn(curatedModuleService, 'getMetaDataFromStorage');
      const getStakingModuleMock = jest
        .spyOn(keysUpdateService, 'getStakingModule')
        .mockImplementation(() => undefined);

      await expect(modulesController.getModule('0x12345')).rejects.toThrowError(
        `Module with moduleId 0x12345 is not supported`,
      );
      expect(getStakingModuleMock).toBeCalledTimes(1);
      expect(getMetaDataFromStorageMock).toBeCalledTimes(0);
    });
  });
});
