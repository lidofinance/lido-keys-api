import { Test } from '@nestjs/testing';
import { MikroORM, QueryOrder } from '@mikro-orm/core';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { key } from '../fixtures/key.fixture';
import { RegistryStorageModule, RegistryStorageService, RegistryKeyStorageService } from '../../';

describe('Keys', () => {
  let storageService: RegistryKeyStorageService;
  let registryService: RegistryStorageService;

  beforeEach(async () => {
    const imports = [
      MikroOrmModule.forRoot({
        dbName: ':memory:',
        type: 'sqlite',
        allowGlobalContext: true,
        entities: ['../**/*.entity.ts'],
      }),
      RegistryStorageModule.forFeature(),
    ];

    const moduleRef = await Test.createTestingModule({ imports }).compile();
    storageService = moduleRef.get(RegistryKeyStorageService);
    registryService = moduleRef.get(RegistryStorageService);

    const generator = moduleRef.get(MikroORM).getSchemaGenerator();
    await generator.updateSchema();
  });

  afterEach(async () => {
    await registryService.onModuleDestroy();
  });

  test('find', async () => {
    const keys = [
      { operatorIndex: 1, index: 1, ...key },
      { operatorIndex: 1, index: 2, ...key },
    ];

    await expect(storageService.findAll()).resolves.toEqual([]);
    await storageService.save(keys);
    await expect(
      storageService.find({ operatorIndex: 1 }, { limit: 1, orderBy: { index: QueryOrder.DESC } }),
    ).resolves.toEqual([keys[1]]);
  });

  test('find by index', async () => {
    const keys = [
      { operatorIndex: 1, index: 1, ...key },
      { operatorIndex: 1, index: 2, ...key },
    ];

    await expect(storageService.findAll()).resolves.toEqual([]);
    await storageService.save(keys);
    await expect(storageService.findOneByIndex(1, 1)).resolves.toEqual(keys[0]);
    await expect(storageService.findOneByIndex(1, 2)).resolves.toEqual(keys[1]);
  });

  test('find by pubkey', async () => {
    const keys = [{ operatorIndex: 1, index: 1, ...key }];

    await expect(storageService.findByPubkey(key.key)).resolves.toEqual([]);
    await storageService.save(keys);
    await expect(storageService.findByPubkey(key.key)).resolves.toEqual([keys[0]]);
  });

  test('find by signature', async () => {
    const keys = [{ operatorIndex: 1, index: 1, ...key }];

    await expect(storageService.findBySignature(key.depositSignature)).resolves.toEqual([]);
    await storageService.save(keys);
    await expect(storageService.findBySignature(key.depositSignature)).resolves.toEqual([keys[0]]);
  });

  test('find by operator', async () => {
    const keys = [
      { operatorIndex: 1, index: 1, ...key },
      { operatorIndex: 1, index: 2, ...key },
    ];

    await expect(storageService.findAll()).resolves.toEqual([]);
    await storageService.save(keys);
    await expect(storageService.findByOperatorIndex(1)).resolves.toEqual(keys);
  });

  test('save one key', async () => {
    const registryKey = { operatorIndex: 1, index: 1, ...key };

    await expect(storageService.findAll()).resolves.toEqual([]);
    await storageService.saveOne(registryKey);
    await expect(storageService.findAll()).resolves.toEqual([registryKey]);
  });

  test('save keys', async () => {
    const keys = [
      { operatorIndex: 1, index: 1, ...key },
      { operatorIndex: 1, index: 2, ...key },
    ];

    await expect(storageService.findAll()).resolves.toEqual([]);
    await storageService.save(keys);
    await expect(storageService.findAll()).resolves.toEqual(keys);
  });

  test('remove one key', async () => {
    const registryKey = { operatorIndex: 1, index: 1, ...key };

    await expect(storageService.findAll()).resolves.toEqual([]);
    await storageService.saveOne(registryKey);
    await expect(storageService.findAll()).resolves.toEqual([registryKey]);
    await storageService.removeOneByIndex(registryKey.operatorIndex, registryKey.index);
    await expect(storageService.findAll()).resolves.toEqual([]);
  });

  test('remove all keys', async () => {
    const keys = [
      { operatorIndex: 1, index: 1, ...key },
      { operatorIndex: 1, index: 2, ...key },
    ];

    await expect(storageService.findAll()).resolves.toEqual([]);
    await storageService.save(keys);
    await expect(storageService.findAll()).resolves.toEqual(keys);
    await storageService.removeAll();
    await expect(storageService.findAll()).resolves.toEqual([]);
  });
});
