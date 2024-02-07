import { Test } from '@nestjs/testing';
import { key } from '../fixtures/key.fixture';
import { RegistryKeyStorageService, RegistryKey, RegistryKeyRepository } from '../../';
import { REGISTRY_CONTRACT_ADDRESSES } from '@lido-nestjs/contracts';
import * as streamUtils from '../../utils/stream.utils';
import { STREAM_KEYS_TIMEOUT_MESSAGE, STREAM_TIMEOUT } from '../../../registry/storage/constants';

describe('Keys', () => {
  const CHAIN_ID = process.env.CHAIN_ID || 1;
  const address = REGISTRY_CONTRACT_ADDRESSES[CHAIN_ID];
  const registryKey = { index: 1, operatorIndex: 1, moduleAddress: address, ...key };

  async function* findKeysAsStream() {
    yield registryKey;
  }

  const streamValue = jest.fn().mockReturnValue(findKeysAsStream());

  const mockedCreateQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getKnexQuery: jest.fn().mockReturnValue({
      stream: streamValue,
    }),
  };

  const addTimeoutToStream = jest.spyOn(streamUtils, 'addTimeoutToStream').mockReturnValue();

  const mockRegistryKeyRepository = {
    findAll: jest.fn().mockImplementation(() => {
      return Promise.resolve([]);
    }),
    find: jest.fn().mockImplementation(() => {
      return Promise.resolve([]);
    }),
    findOne: jest.fn().mockImplementation(() => {
      return Promise.resolve(registryKey);
    }),
    persistAndFlush: jest.fn().mockImplementation((key: RegistryKey) => {
      return Promise.resolve({ ...key });
    }),
    persist: jest.fn().mockImplementation((key: RegistryKey) => {
      return Promise.resolve({ ...key });
    }),
    flush: jest.fn().mockImplementation(() => {
      return;
    }),
    nativeDelete: jest.fn().mockImplementation(() => {
      return 1;
    }),
    createQueryBuilder: jest.fn().mockReturnValue(mockedCreateQueryBuilder),
  };

  let storageService: RegistryKeyStorageService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [RegistryKeyStorageService, { provide: RegistryKeyRepository, useValue: mockRegistryKeyRepository }],
    }).compile();

    storageService = moduleRef.get(RegistryKeyStorageService);
  });

  beforeEach(() => {
    Object.values(mockRegistryKeyRepository).forEach((mockCall) => {
      mockCall.mockClear();
    });
  });

  test('find', async () => {
    await expect(storageService.find({ used: true }, { limit: 1 })).resolves.toEqual([]);
    expect(mockRegistryKeyRepository.find).toBeCalledTimes(1);
    expect(mockRegistryKeyRepository.find).toBeCalledWith({ used: true }, { limit: 1 });
  });

  test('findAsStream', async () => {
    const stream = storageService.findAsStream({ used: true });
    const actualResult: RegistryKey[] = [];
    for await (const item of stream) {
      actualResult.push(item);
    }
    expect(actualResult).toEqual([registryKey]);
    expect(mockRegistryKeyRepository.createQueryBuilder).toBeCalledTimes(1);
    expect(mockedCreateQueryBuilder.select).toBeCalledWith('*');
    expect(mockedCreateQueryBuilder.where).toBeCalledWith({ used: true });
    expect(mockedCreateQueryBuilder.orderBy).toBeCalledWith({ index: 'asc', operator_index: 'asc' });
    expect(mockedCreateQueryBuilder.getKnexQuery).toBeCalledTimes(1);
    expect(streamValue).toBeCalledTimes(1);
    expect(addTimeoutToStream).toBeCalledWith(stream, STREAM_TIMEOUT, STREAM_KEYS_TIMEOUT_MESSAGE);
  });

  test('findAll', async () => {
    await expect(storageService.findAll(address)).resolves.toEqual([]);
    expect(mockRegistryKeyRepository.find).toBeCalledTimes(1);
  });

  test('findUsed', async () => {
    await expect(storageService.findUsed(address)).resolves.toEqual([]);
    expect(mockRegistryKeyRepository.find).toBeCalledTimes(1);
    expect(mockRegistryKeyRepository.find).toBeCalledWith({ moduleAddress: address, used: true });
  });

  test('findByOperatorIndex', async () => {
    await expect(storageService.findByOperatorIndex(address, 1)).resolves.toEqual([]);
    expect(mockRegistryKeyRepository.find).toBeCalledTimes(1);
  });

  test('findOneByIndex', async () => {
    await expect(storageService.findOneByIndex(address, registryKey.operatorIndex, registryKey.index)).resolves.toEqual(
      registryKey,
    );
    expect(mockRegistryKeyRepository.findOne).toBeCalledTimes(1);
  });

  test('findOneByPubkey', async () => {
    await expect(storageService.findByPubkey(address, '')).resolves.toEqual([]);
    expect(mockRegistryKeyRepository.find).toBeCalledTimes(1);
  });

  test('findOneBySignature', async () => {
    await expect(storageService.findBySignature(address, '')).resolves.toEqual([]);
    expect(mockRegistryKeyRepository.find).toBeCalledTimes(1);
  });

  test('removeOneByIndex', async () => {
    await expect(
      storageService.removeOneByIndex(address, registryKey.operatorIndex, registryKey.index),
    ).resolves.toEqual(1);
    expect(mockRegistryKeyRepository.nativeDelete).toBeCalledTimes(1);
  });

  test('removeAll', async () => {
    await expect(storageService.removeAll()).resolves.toEqual(1);
    expect(mockRegistryKeyRepository.nativeDelete).toBeCalledTimes(1);
  });

  test('saveOne', async () => {
    await expect(storageService.saveOne(registryKey)).resolves.toEqual(registryKey);
    expect(mockRegistryKeyRepository.persistAndFlush).toBeCalledTimes(1);
  });

  test('save', async () => {
    await expect(storageService.save([registryKey])).resolves.toEqual([registryKey]);
    expect(mockRegistryKeyRepository.persist).toBeCalledTimes(1);
    expect(mockRegistryKeyRepository.flush).toBeCalledTimes(1);
  });
});
