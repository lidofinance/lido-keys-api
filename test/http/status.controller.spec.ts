/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test } from '@nestjs/testing';
import { CuratedModuleService } from 'staking-router-modules';
import { ValidatorsService } from 'validators';
import { ConfigService } from 'common/config';
import { elMeta, elBlockSnapshot, clMeta, clBlockSnapshot } from '../fixtures';
import { StatusController, StatusService } from 'http/status';
import { APP_VERSION } from 'app/app.constants';
import { EntityManager } from '@mikro-orm/postgresql';

describe('SRModulesOperatorsController', () => {
  let statusController: StatusController;
  let curatedModuleService: CuratedModuleService;
  let validatorsService: ValidatorsService;

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

  class ValidatorsServiceMock {
    getMetaDataFromStorage() {
      return Promise.resolve(clMeta);
    }
  }

  class EntityManagerMock {
    transactional(func) {
      return Promise.resolve(func());
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
          provide: EntityManager,
          useClass: EntityManagerMock,
        },
      ],
    }).compile();

    statusController = moduleRef.get<StatusController>(StatusController);
    curatedModuleService = moduleRef.get<CuratedModuleService>(CuratedModuleService);
    validatorsService = moduleRef.get<ValidatorsService>(ValidatorsService);
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  describe('StatusController', () => {
    test('get', async () => {
      process.env['CHAIN_ID'] = '1';

      const getELMetaDataMock = jest.spyOn(curatedModuleService, 'getMetaDataFromStorage');
      const getCLMetaDataMock = jest.spyOn(validatorsService, 'getMetaDataFromStorage');

      const result = await statusController.get();

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
