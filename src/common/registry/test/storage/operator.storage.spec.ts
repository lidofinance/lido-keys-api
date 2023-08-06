import { Test } from '@nestjs/testing';
import { operator } from '../fixtures/operator.fixture';
import { RegistryOperatorStorageService, RegistryOperator, RegistryOperatorRepository } from '../../';
import { REGISTRY_CONTRACT_ADDRESSES } from '@lido-nestjs/contracts';

describe('Operators', () => {
  const CHAIN_ID = process.env.CHAIN_ID || 1;
  const address = REGISTRY_CONTRACT_ADDRESSES[CHAIN_ID];
  const registryOperator = { index: 1, moduleAddress: address, ...operator };
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

  test('findAll', async () => {
    await expect(storageService.findAll()).resolves.toEqual([]);
    expect(mockRegistryOperatorRepository.findAll).toBeCalledTimes(1);
  });

  test('findOneByIndex', async () => {
    await expect(storageService.findOneByIndex(registryOperator.index)).resolves.toEqual(registryOperator);
    expect(mockRegistryOperatorRepository.findOne).toBeCalledTimes(1);
  });

  test('removeOneByIndex', async () => {
    await expect(storageService.removeOneByIndex(registryOperator.index)).resolves.toEqual(1);
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
