import { Test } from '@nestjs/testing';
import { key } from '../fixtures/key.fixture';
import { RegistryKeyStorageService, RegistryKey, RegistryKeyRepository } from '../../';
import { REGISTRY_CONTRACT_ADDRESSES } from '@lido-nestjs/contracts';

describe('Keys', () => {
  const CHAIN_ID = process.env.CHAIN_ID || 1;
  const address = REGISTRY_CONTRACT_ADDRESSES[CHAIN_ID];
  const registryKey = { index: 1, operatorIndex: 1, moduleAddress: address, ...key };
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
