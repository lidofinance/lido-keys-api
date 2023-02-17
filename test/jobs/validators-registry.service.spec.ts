/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test } from '@nestjs/testing';
import { ValidatorsRegistryInterface } from '@lido-nestjs/validators-registry';
import { operatorOneValidatorsToExit, clMeta, operatorOneUsedKeys } from '../fixtures';
import { ValidatorsRegistryService } from '../../src/jobs/validators-registry.service';
import { LOGGER_PROVIDER } from 'common/logger';
import { PrometheusService } from 'common/prometheus';
import { toBoolean, ConfigService } from 'common/config';
import { JobService } from 'common/job';

describe('getOldestValidators', () => {
  let validatorsRegistryInterface: ValidatorsRegistryInterface;
  let validatorsRegistry: ValidatorsRegistryService;
  const OLD_ENV = process.env;

  class JobServiceMock {}

  class ConfigServiceMock {
    get(value) {
      if (value == 'VALIDATOR_REGISTRY_ENABLE') {
        return toBoolean(process.env[value]);
      }
      return process.env[value];
    }
  }

  class ValidatorsRegistryInterfaceMock {
    getValidators(v, w, opt) {
      return jest.fn();
    }
  }

  class PrometheusServiceMock {}

  beforeEach(async () => {
    process.env = { ...OLD_ENV };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ValidatorsRegistryService,
        { provide: ValidatorsRegistryInterface, useClass: ValidatorsRegistryInterfaceMock },
        {
          provide: ConfigService,
          useClass: ConfigServiceMock,
        },
        {
          provide: PrometheusService,
          useClass: PrometheusServiceMock,
        },
        {
          provide: JobService,
          useClass: JobServiceMock,
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

    validatorsRegistryInterface = moduleRef.get<ValidatorsRegistryInterface>(ValidatorsRegistryInterface);
    validatorsRegistry = moduleRef.get<ValidatorsRegistryService>(ValidatorsRegistryService);
  });

  test('percent has a higher priority', async () => {
    process.env['VALIDATOR_REGISTRY_ENABLE'] = 'true';

    // this function should return validators with specified and specified statuses  and in specified order
    const getValidatorsMock = jest
      .spyOn(validatorsRegistryInterface, 'getValidators')
      .mockImplementation(() => Promise.resolve({ validators: operatorOneValidatorsToExit, meta: clMeta }));

    expect(operatorOneValidatorsToExit.length).toBe(6);

    const result = await validatorsRegistry.getOldestValidators({
      pubkeys: operatorOneUsedKeys.map((k) => k.key),
      // we dont check in this function  statuses
      statuses: [],
      max_amount: 50,
      percent: 50,
    });

    // 50%
    expect(result).toEqual({
      validators: [operatorOneValidatorsToExit[0], operatorOneValidatorsToExit[1], operatorOneValidatorsToExit[2]],
      meta: clMeta,
    });

    expect(getValidatorsMock).toBeCalledTimes(1);
    expect(getValidatorsMock).toBeCalledWith(
      operatorOneUsedKeys.map((k) => k.key),
      { status: { $in: [] } },
      { orderBy: { index: 'ASC' } },
    );
  });

  test('percent is not provided', async () => {
    process.env['VALIDATOR_REGISTRY_ENABLE'] = 'true';
    // this function should return validators with specified and specified statuses  and in specified order
    const getValidatorsMock = jest
      .spyOn(validatorsRegistryInterface, 'getValidators')
      .mockImplementation(() => Promise.resolve({ validators: operatorOneValidatorsToExit, meta: clMeta }));

    expect(operatorOneValidatorsToExit.length).toBe(6);

    const result = await validatorsRegistry.getOldestValidators({
      pubkeys: operatorOneUsedKeys.map((k) => k.key),
      // we dont check in this function  statuses
      statuses: [],
      max_amount: 5,
      percent: undefined,
    });

    expect(result).toEqual({
      validators: [
        operatorOneValidatorsToExit[0],
        operatorOneValidatorsToExit[1],
        operatorOneValidatorsToExit[2],
        operatorOneValidatorsToExit[3],
        operatorOneValidatorsToExit[4],
      ],
      meta: clMeta,
    });

    expect(getValidatorsMock).toBeCalledTimes(1);
    expect(getValidatorsMock).toBeCalledWith(
      operatorOneUsedKeys.map((k) => k.key),
      { status: { $in: [] } },
      { orderBy: { index: 'ASC' } },
    );
  });
});
