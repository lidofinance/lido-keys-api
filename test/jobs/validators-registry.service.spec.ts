import { Test } from '@nestjs/testing';
import { ValidatorsRegistryInterface } from '@lido-nestjs/validators-registry';
import { operatorOneValidatorsToExit, clMeta, operatorOneUsedKeys } from '../fixtures';
import { ValidatorsRegistryService } from '../../src/jobs/validators-registry.service';
import { LOGGER_PROVIDER } from 'common/logger';
import { PrometheusService } from 'common/prometheus';
import { ConfigService } from 'common/config';
import { JobService } from 'common/job';

describe('getOldestValidators', () => {
  let validatorsRegistryInterface: ValidatorsRegistryInterface;
  let validatorsRegistry: ValidatorsRegistryService;

  class JobServiceMock {}

  class ConfigServiceMock {
    get(value) {
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
    // this function should return validators with specified and specified statuses  and in specified order
    const getValidatorsMock = jest
      .spyOn(validatorsRegistryInterface, 'getValidators')
      .mockImplementation(() => Promise.resolve({ validators: operatorOneValidatorsToExit, meta: clMeta }));

    expect(operatorOneValidatorsToExit.length).toBe(6);

    const { meta, validators } = await validatorsRegistry.getOldestValidators({
      pubkeys: operatorOneUsedKeys.map((k) => k.key),
      // we dont check in this function  statuses
      statuses: [],
      max_amount: 50,
      percent: 50,
    });

    // 50%
    expect(validators.length).toBe(3);

    expect(validators).toEqual([
      operatorOneValidatorsToExit[0],
      operatorOneValidatorsToExit[1],
      operatorOneValidatorsToExit[2],
    ]);

    expect(getValidatorsMock).toBeCalledTimes(1);
    expect(getValidatorsMock).toBeCalledWith(
      operatorOneUsedKeys.map((k) => k.key),
      { status: { $in: [] } },
      { orderBy: { index: 'ASC' } },
    );
  });

  test('percent is not provided', async () => {
    // this function should return validators with specified and specified statuses  and in specified order
    const getValidatorsMock = jest
      .spyOn(validatorsRegistryInterface, 'getValidators')
      .mockImplementation(() => Promise.resolve({ validators: operatorOneValidatorsToExit, meta: clMeta }));

    expect(operatorOneValidatorsToExit.length).toBe(6);

    const { meta, validators } = await validatorsRegistry.getOldestValidators({
      pubkeys: operatorOneUsedKeys.map((k) => k.key),
      // we dont check in this function  statuses
      statuses: [],
      max_amount: 5,
      percent: undefined,
    });

    // 50%
    expect(validators.length).toBe(5);

    expect(validators).toEqual([
      operatorOneValidatorsToExit[0],
      operatorOneValidatorsToExit[1],
      operatorOneValidatorsToExit[2],
      operatorOneValidatorsToExit[3],
      operatorOneValidatorsToExit[4],
    ]);

    expect(getValidatorsMock).toBeCalledTimes(1);
    expect(getValidatorsMock).toBeCalledWith(
      operatorOneUsedKeys.map((k) => k.key),
      { status: { $in: [] } },
      { orderBy: { index: 'ASC' } },
    );
  });
});
