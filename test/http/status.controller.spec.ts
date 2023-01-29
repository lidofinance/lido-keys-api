/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test } from '@nestjs/testing';
import { RegistryService } from '../../src/jobs/registry.service';
import { ValidatorsRegistryService } from 'jobs/validators-registry.service';
import { ConfigService } from '../../src/common/config';
import { elMeta, elBlockSnapshot, clMeta, clBlockSnapshot } from '../fixtures';
import { StatusController, StatusService } from '../../src/http/status';
import { APP_VERSION } from 'app/app.constants';

describe('SRModulesOperatorsController', () => {
  let operatorsKeysController: StatusController;
  let registryService: RegistryService;
  let validatorsService: ValidatorsRegistryService;

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

  class ValidatorsRegistryServiceMock {
    getMetaDataFromStorage() {
      return Promise.resolve(clMeta);
    }
  }

  const OLD_ENV = process.env;

  beforeEach(async () => {
    jest.resetModules();
    process.env = { ...OLD_ENV };

    const moduleRef = await Test.createTestingModule({
      controllers: [StatusController],
      providers: [
        StatusService,
        {
          provide: RegistryService,
          useClass: RegistryServiceMock,
        },
        {
          provide: ValidatorsRegistryService,
          useClass: ValidatorsRegistryServiceMock,
        },
        {
          provide: ConfigService,
          useClass: ConfigServiceMock,
        },
      ],
    }).compile();

    operatorsKeysController = moduleRef.get<StatusController>(StatusController);
    registryService = moduleRef.get<RegistryService>(RegistryService);
    validatorsService = moduleRef.get<ValidatorsRegistryService>(ValidatorsRegistryService);
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  describe('StatusController', () => {
    test('get', async () => {
      process.env['CHAIN_ID'] = '1';

      const getELMetaDataMock = jest.spyOn(registryService, 'getMetaDataFromStorage');
      const getCLMetaDataMock = jest.spyOn(validatorsService, 'getMetaDataFromStorage');

      const result = await operatorsKeysController.get();

      expect(result).toEqual({
        chainId: '1',
        elBlockSnapshot,
        clBlockSnapshot,
        appVersion: APP_VERSION,
      });

      expect(getELMetaDataMock).toBeCalledTimes(1);
      expect(getCLMetaDataMock).toBeCalledTimes(1);
    });
  });
});
