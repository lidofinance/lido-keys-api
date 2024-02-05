import { Test } from '@nestjs/testing';
import { operator } from '../fixtures/operator.fixture';
import { RegistryOperatorStorageService, RegistryOperator, RegistryOperatorRepository } from '../../';
import { REGISTRY_CONTRACT_ADDRESSES } from '@lido-nestjs/contracts';
import * as streamUtils from '../../utils/stream.utils';
import { STREAM_OPERATORS_TIMEOUT_MESSAGE, STREAM_TIMEOUT } from '../../../registry/storage/constants';

describe('Operators', () => {
  const CHAIN_ID = process.env.CHAIN_ID || 1;
  const address = REGISTRY_CONTRACT_ADDRESSES[CHAIN_ID];
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
    persistAndFlush: jest.fn().mockImplementation((operator: RegistryOperator) => {
      return Promise.resolve({ ...operator });
    }),
    persist: jest.fn().mockImplementation((operator: RegistryOperator) => {
      return Promise.resolve({ ...operator });
    }),
    flush: jest.fn().mockImplementation(() => {
      return;
    }),
    nativeDelete: jest.fn().mockImplementation(() => {
      return 1;
    }),
    createQueryBuilder: jest.fn().mockReturnValue(mockedCreateQueryBuilder),
  };

  let storageService: RegistryOperatorStorageService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        RegistryOperatorStorageService,
        {
          provide: RegistryOperatorRepository,
          useValue: mockRegistryOperatorRepository,
        },
      ],
    }).compile();

    storageService = moduleRef.get(RegistryOperatorStorageService);
  });

  beforeEach(() => {
    Object.values(mockRegistryOperatorRepository).forEach((mockCall) => {
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
    expect(addTimeoutToStream).toBeCalledWith(stream, STREAM_TIMEOUT, STREAM_OPERATORS_TIMEOUT_MESSAGE);
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
    await expect(storageService.saveOne(registryOperator)).resolves.toEqual(registryOperator);
    expect(mockRegistryOperatorRepository.persistAndFlush).toBeCalledTimes(1);
  });

  test('save', async () => {
    await expect(storageService.save([registryOperator])).resolves.toEqual([registryOperator]);
    expect(mockRegistryOperatorRepository.persist).toBeCalledTimes(1);
    expect(mockRegistryOperatorRepository.flush).toBeCalledTimes(1);
  });
});
