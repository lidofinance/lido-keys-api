import { Test } from '@nestjs/testing';
import { operator } from '../fixtures/operator.fixture';
import { RegistryOperatorStorageService, RegistryOperator, RegistryOperatorRepository } from '../../';
import * as streamUtils from 'common/registry/utils/stream.utils';
import { DEFAULT_STREAM_TIMEOUT, STREAM_OPERATORS_TIMEOUT_MESSAGE } from 'common/registry/storage/constants';
import { ConfigModule, ConfigService } from 'common/config';

describe('Operators', () => {
  const address = '0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5 ';
  const registryOperator = { index: 1, moduleAddress: address, ...operator };

  async function* findOperatorsAsStream() {
    yield registryOperator;
  }

  const streamValue = jest.fn().mockReturnValue(findOperatorsAsStream());

  const mockedCreateQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getKnexQuery: jest.fn().mockReturnValue({
      stream: streamValue,
    }),
  };

  const addTimeoutToStream = jest.spyOn(streamUtils, 'addTimeoutToStream').mockReturnValue();

  // em.persist returns the same entity manager, so persist(x).flush() chains as in MikroORM
  const mockEntityManager = {
    persist: jest.fn().mockReturnThis(),
    flush: jest.fn().mockResolvedValue(undefined),
  };

  const mockRegistryOperatorRepository = {
    findAll: jest.fn().mockImplementation(() => {
      return Promise.resolve([]);
    }),
    find: jest.fn().mockImplementation(() => {
      return Promise.resolve([]);
    }),
    findOne: jest.fn().mockImplementation(() => {
      return Promise.resolve(registryOperator);
    }),
    nativeDelete: jest.fn().mockImplementation(() => {
      return 1;
    }),
    createQueryBuilder: jest.fn().mockReturnValue(mockedCreateQueryBuilder),
    getEntityManager: jest.fn().mockReturnValue(mockEntityManager),
  };

  let storageService: RegistryOperatorStorageService;
  let configService: ConfigService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule],
      providers: [
        RegistryOperatorStorageService,
        {
          provide: RegistryOperatorRepository,
          useValue: mockRegistryOperatorRepository,
        },
      ],
    }).compile();

    storageService = moduleRef.get(RegistryOperatorStorageService);
    configService = moduleRef.get(ConfigService);

    jest.spyOn(configService, 'get').mockImplementation((path) => {
      if (path === 'STREAM_TIMEOUT') {
        return DEFAULT_STREAM_TIMEOUT;
      }

      return configService.get(path);
    });
  });

  beforeEach(() => {
    [...Object.values(mockRegistryOperatorRepository), ...Object.values(mockEntityManager)].forEach((mockCall) => {
      mockCall.mockClear();
    });
  });

  test('find', async () => {
    await expect(storageService.find({ active: true }, { limit: 1 })).resolves.toEqual([]);
    expect(mockRegistryOperatorRepository.find).toBeCalledTimes(1);
    expect(mockRegistryOperatorRepository.find).toBeCalledWith({ active: true }, { limit: 1 });
  });

  test('findAsStream', async () => {
    const stream = storageService.findAsStream({ active: true });
    const actualResult: RegistryOperator[] = [];
    for await (const item of stream) {
      actualResult.push(item);
    }
    expect(actualResult).toEqual([registryOperator]);
    expect(mockRegistryOperatorRepository.createQueryBuilder).toBeCalledTimes(1);
    expect(mockedCreateQueryBuilder.select).toBeCalledWith('*');
    expect(mockedCreateQueryBuilder.where).toBeCalledWith({ active: true });
    expect(mockedCreateQueryBuilder.orderBy).toBeCalledWith({ index: 'asc', module_address: 'asc' });
    expect(mockedCreateQueryBuilder.getKnexQuery).toBeCalledTimes(1);
    expect(streamValue).toBeCalledTimes(1);
    expect(addTimeoutToStream).toBeCalledWith(stream, DEFAULT_STREAM_TIMEOUT, STREAM_OPERATORS_TIMEOUT_MESSAGE);
  });

  test('findAll', async () => {
    await expect(storageService.findAll(address)).resolves.toEqual([]);
    expect(mockRegistryOperatorRepository.find).toBeCalledTimes(1);
  });

  test('findOneByIndex', async () => {
    await expect(storageService.findOneByIndex(address, registryOperator.index)).resolves.toEqual(registryOperator);
    expect(mockRegistryOperatorRepository.findOne).toBeCalledTimes(1);
  });

  test('removeOneByIndex', async () => {
    await expect(storageService.removeOneByIndex(address, registryOperator.index)).resolves.toEqual(1);
    expect(mockRegistryOperatorRepository.nativeDelete).toBeCalledTimes(1);
  });

  test('removeAll', async () => {
    await expect(storageService.removeAll()).resolves.toEqual(1);
    expect(mockRegistryOperatorRepository.nativeDelete).toBeCalledTimes(1);
  });

  test('saveOne', async () => {
    await storageService.saveOne(registryOperator);
    expect(mockEntityManager.persist).toBeCalledTimes(1);
    expect(mockEntityManager.persist).toBeCalledWith(expect.objectContaining(registryOperator));
    expect(mockEntityManager.flush).toBeCalledTimes(1);
  });

  test('save', async () => {
    await storageService.save([registryOperator]);
    expect(mockEntityManager.persist).toBeCalledTimes(1);
    expect(mockEntityManager.persist).toBeCalledWith(expect.objectContaining(registryOperator));
    expect(mockEntityManager.flush).toBeCalledTimes(1);
  });
});
