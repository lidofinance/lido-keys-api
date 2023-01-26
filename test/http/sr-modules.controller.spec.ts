/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test } from '@nestjs/testing';
import { SRModulesController, SRModulesService } from '../../src/http/sr-modules';
import { ConfigService } from '../../src/common/config';
import { RegistryService } from '../../src/jobs/registry.service';
import { communityModuleMainnet, communityModuleGoerli, elMeta, elBlockSnapshot } from '../fixtures';

describe('SRModules controller', () => {
  let modulesController: SRModulesController;
  let registryService: RegistryService;

  class ConfigServiceMock {
    get(value) {
      return process.env[value];
    }
  }

  class RegistryServiceMock {
    getMetaDataFromStorage() {
      return Promise.resolve(elMeta);
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
        data: [communityModuleMainnet],
        elBlockSnapshot,
      });
    });

    test('modules on goerli', async () => {
      process.env['CHAIN_ID'] = '5';
      const getMetaDataFromStorageMock = jest.spyOn(registryService, 'getMetaDataFromStorage');
      const result = await modulesController.getModules();

      expect(getMetaDataFromStorageMock).toBeCalledTimes(1);
      expect(result).toEqual({
        data: [communityModuleGoerli],
        elBlockSnapshot,
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
        data: communityModuleMainnet,
        elBlockSnapshot,
      });
    });

    test('module on goerli', async () => {
      process.env['CHAIN_ID'] = '5';
      const getMetaDataFromStorageMock = jest.spyOn(registryService, 'getMetaDataFromStorage');
      const result = await modulesController.getModule('0x9D4AF1Ee19Dad8857db3a45B0374c81c8A1C6320');
      expect(getMetaDataFromStorageMock).toBeCalledTimes(1);
      expect(result).toEqual({
        data: communityModuleGoerli,
        elBlockSnapshot,
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
});
