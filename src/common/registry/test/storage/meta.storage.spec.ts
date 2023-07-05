import { Test } from '@nestjs/testing';
import { meta } from '../fixtures/meta.fixture';
import { RegistryMetaStorageService, RegistryMeta, RegistryMetaRepository } from '../../';

describe('Meta', () => {
  const mockRegistryMetaRepository = {
    find: jest.fn().mockImplementation(() => {
      return Promise.resolve([meta]);
    }),
    persistAndFlush: jest.fn().mockImplementation((meta: RegistryMeta) => {
      return Promise.resolve({ ...meta });
    }),
    nativeDelete: jest.fn().mockImplementation(() => {
      return 1;
    }),
  };

  let storageService: RegistryMetaStorageService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        RegistryMetaStorageService,
        {
          provide: RegistryMetaRepository,
          useValue: mockRegistryMetaRepository,
        },
      ],
    }).compile();

    storageService = moduleRef.get(RegistryMetaStorageService);
  });

  beforeEach(() => {
    Object.values(mockRegistryMetaRepository).forEach((mockCall) => {
      mockCall.mockClear();
    });
  });

  test('get', async () => {
    await expect(storageService.get()).resolves.toEqual(meta);
    expect(mockRegistryMetaRepository.find).toBeCalledTimes(1);
  });

  test('get empty', async () => {
    mockRegistryMetaRepository.find.mockImplementationOnce(() => []);
    await expect(storageService.get()).resolves.toEqual(null);
    expect(mockRegistryMetaRepository.find).toBeCalledTimes(1);
  });

  test('remove', async () => {
    await expect(storageService.remove()).resolves.toEqual(1);
    expect(mockRegistryMetaRepository.nativeDelete).toBeCalledTimes(1);
  });

  test('save', async () => {
    await expect(storageService.save(meta)).resolves.toEqual(meta);
    expect(mockRegistryMetaRepository.persistAndFlush).toBeCalledTimes(1);
  });
});
