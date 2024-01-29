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

  async function* findKeysAsStream() {
    yield registryOperator;
  }

  const mockedKnex = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    stream: jest.fn().mockReturnValue(findKeysAsStream()),
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
    getKnex: jest.fn().mockReturnValue(mockedKnex),
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
    expect(mockRegistryOperatorRepository.getKnex).toBeCalledTimes(1);
    expect(mockedKnex.select).toBeCalledWith('*');
    expect(mockedKnex.from).toBeCalledWith('registry_operator');
    expect(mockedKnex.where).toBeCalledWith({ active: true });
    expect(mockedKnex.orderBy).toBeCalledWith([
      { column: 'moduleAddress', order: 'asc' },
      { column: 'index', order: 'asc' },
    ]);
    expect(mockedKnex.stream).toBeCalledTimes(1);
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
