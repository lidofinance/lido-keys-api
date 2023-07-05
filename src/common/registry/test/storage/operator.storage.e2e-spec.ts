import { Test } from '@nestjs/testing';
import { MikroORM, QueryOrder } from '@mikro-orm/core';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { operator } from '../fixtures/operator.fixture';
import { RegistryStorageModule, RegistryStorageService, RegistryOperatorStorageService } from '../../';

describe('Operators', () => {
  let storageService: RegistryOperatorStorageService;
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
    storageService = moduleRef.get(RegistryOperatorStorageService);
    registryService = moduleRef.get(RegistryStorageService);

    const generator = moduleRef.get(MikroORM).getSchemaGenerator();
    await generator.updateSchema();
  });

  afterEach(async () => {
    await registryService.onModuleDestroy();
  });

  test('find', async () => {
    const operators = [
      { index: 1, ...operator },
      { index: 2, ...operator },
    ];

    await expect(storageService.findAll()).resolves.toEqual([]);
    await storageService.save(operators);
    await expect(
      storageService.find({ active: true }, { limit: 1, orderBy: { index: QueryOrder.DESC } }),
    ).resolves.toEqual([operators[1]]);
  });

  test('save one operator', async () => {
    const registryOperator = { index: 1, ...operator };

    await expect(storageService.findAll()).resolves.toEqual([]);
    await storageService.saveOne(registryOperator);
    await expect(storageService.findAll()).resolves.toEqual([registryOperator]);
  });

  test('save operators', async () => {
    const operators = [
      { index: 1, ...operator },
      { index: 2, ...operator },
    ];

    await expect(storageService.findAll()).resolves.toEqual([]);
    await storageService.save(operators);
    await expect(storageService.findAll()).resolves.toEqual(operators);
  });

  test('remove one operator', async () => {
    const registryOperator = { index: 1, ...operator };

    await expect(storageService.findAll()).resolves.toEqual([]);
    await storageService.saveOne(registryOperator);
    await expect(storageService.findAll()).resolves.toEqual([registryOperator]);
    await storageService.removeOneByIndex(registryOperator.index);
    await expect(storageService.findAll()).resolves.toEqual([]);
  });

  test('remove all operators', async () => {
    const operators = [
      { index: 1, ...operator },
      { index: 2, ...operator },
    ];

    await expect(storageService.findAll()).resolves.toEqual([]);
    await storageService.save(operators);
    await expect(storageService.findAll()).resolves.toEqual(operators);
    await storageService.removeAll();
    await expect(storageService.findAll()).resolves.toEqual([]);
  });
});
