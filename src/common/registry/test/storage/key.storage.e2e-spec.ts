import { Test } from '@nestjs/testing';
import { MikroORM, QueryOrder } from '@mikro-orm/core';
import { key } from '../fixtures/key.fixture';
import { RegistryStorageModule, RegistryStorageService, RegistryKeyStorageService } from '../../';
import { LIDO_LOCATOR_CONTRACT_ADDRESSES } from 'common/contracts';
import { LidoLocator__factory, StakingRouter__factory } from 'generated';
import * as dotenv from 'dotenv';
import { DatabaseE2ETestingModule } from 'app';
import { JsonRpcBatchProvider } from '@ethersproject/providers';

dotenv.config();

describe('Keys', () => {
  let storageService: RegistryKeyStorageService;
  let registryService: RegistryStorageService;
  let address;
  if (!process.env.CHAIN_ID) {
    console.error("CHAIN_ID wasn't provides");
    process.exit(1);
  }
  const chainId = process.env.CHAIN_ID as any;

  beforeEach(async () => {
    const imports = [DatabaseE2ETestingModule.forRoot(), RegistryStorageModule.forFeature()];

    const provider = new JsonRpcBatchProvider(process.env.PROVIDERS_URLS);
    const locatorAddress = LIDO_LOCATOR_CONTRACT_ADDRESSES[chainId];
    const locator = LidoLocator__factory.connect(locatorAddress, provider);
    const stakingRouterAddress = await locator.stakingRouter();
    const stakingRouter = StakingRouter__factory.connect(stakingRouterAddress, provider);
    const modules = await stakingRouter.getStakingModules();
    address = modules[0].stakingModuleAddress.toLowerCase();

    const moduleRef = await Test.createTestingModule({ imports }).compile();
    storageService = moduleRef.get(RegistryKeyStorageService);
    registryService = moduleRef.get(RegistryStorageService);

    const generator = moduleRef.get(MikroORM).getSchemaGenerator();
    await generator.refreshDatabase();
    await generator.clearDatabase();
  });

  afterEach(async () => {
    await registryService.onModuleDestroy();
  });

  test('find', async () => {
    const keys = [
      { operatorIndex: 1, index: 1, moduleAddress: address, ...key, vetted: true },
      { operatorIndex: 1, index: 2, moduleAddress: address, ...key, vetted: true },
    ];

    await expect(storageService.findAll(address)).resolves.toEqual([]);
    await storageService.save(keys);
    await expect(
      storageService.find({ operatorIndex: 1 }, { limit: 1, orderBy: { index: QueryOrder.DESC } }),
    ).resolves.toEqual([keys[1]]);
  });

  test('find by index', async () => {
    const keys = [
      { operatorIndex: 1, index: 1, moduleAddress: address, ...key, vetted: true },
      { operatorIndex: 1, index: 2, moduleAddress: address, ...key, vetted: true },
    ];

    await expect(storageService.findAll(address)).resolves.toEqual([]);
    await storageService.save(keys);
    await expect(storageService.findOneByIndex(address, 1, 1)).resolves.toEqual(keys[0]);
    await expect(storageService.findOneByIndex(address, 1, 2)).resolves.toEqual(keys[1]);
  });

  test('find by pubkey', async () => {
    const keys = [{ operatorIndex: 1, index: 1, moduleAddress: address, ...key, vetted: true }];

    await expect(storageService.findByPubkey(address, key.key)).resolves.toEqual([]);
    await storageService.save(keys);
    await expect(storageService.findByPubkey(address, key.key)).resolves.toEqual([keys[0]]);
  });

  test('find by signature', async () => {
    const keys = [{ operatorIndex: 1, index: 1, moduleAddress: address, ...key, vetted: true }];

    await expect(storageService.findBySignature(address, key.depositSignature)).resolves.toEqual([]);
    await storageService.save(keys);
    await expect(storageService.findBySignature(address, key.depositSignature)).resolves.toEqual([keys[0]]);
  });

  test('find by operator', async () => {
    const keys = [
      { operatorIndex: 1, index: 1, moduleAddress: address, ...key, vetted: true },
      { operatorIndex: 1, index: 2, moduleAddress: address, ...key, vetted: true },
    ];

    await expect(storageService.findAll(address)).resolves.toEqual([]);
    await storageService.save(keys);
    await expect(storageService.findByOperatorIndex(address, 1)).resolves.toEqual(keys);
  });

  test('save one key', async () => {
    const registryKey = { operatorIndex: 1, index: 1, moduleAddress: address, ...key, vetted: true };

    await expect(storageService.findAll(address)).resolves.toEqual([]);
    await storageService.saveOne(registryKey);
    await expect(storageService.findAll(address)).resolves.toEqual([registryKey]);
  });

  test('save keys', async () => {
    const keys = [
      { operatorIndex: 1, index: 1, moduleAddress: address, ...key, vetted: true },
      { operatorIndex: 1, index: 2, moduleAddress: address, ...key, vetted: true },
    ];

    await expect(storageService.findAll(address)).resolves.toEqual([]);
    await storageService.save(keys);
    await expect(storageService.findAll(address)).resolves.toEqual(keys);
  });

  test('remove one key', async () => {
    const registryKey = { operatorIndex: 1, index: 1, moduleAddress: address, ...key, vetted: true };

    await expect(storageService.findAll(address)).resolves.toEqual([]);
    await storageService.saveOne(registryKey);
    await expect(storageService.findAll(address)).resolves.toEqual([registryKey]);
    await storageService.removeOneByIndex(address, registryKey.operatorIndex, registryKey.index);
    await expect(storageService.findAll(address)).resolves.toEqual([]);
  });

  test('remove all keys', async () => {
    const keys = [
      { operatorIndex: 1, index: 1, moduleAddress: address, ...key, vetted: true },
      { operatorIndex: 1, index: 2, moduleAddress: address, ...key, vetted: true },
    ];

    await expect(storageService.findAll(address)).resolves.toEqual([]);
    await storageService.save(keys);
    await expect(storageService.findAll(address)).resolves.toEqual(keys);
    await storageService.removeAll();
    await expect(storageService.findAll(address)).resolves.toEqual([]);
  });

  test('getUsedKeysStatsPerOperator aggregates used keys per operator', async () => {
    const mk = (operatorIndex: number, index: number, used: boolean) => ({
      operatorIndex,
      index,
      moduleAddress: address,
      ...key,
      used,
      vetted: true,
    });

    await storageService.save([
      // operator 1: used prefix [0, 3), one unused above it
      mk(1, 0, true),
      mk(1, 1, true),
      mk(1, 2, true),
      mk(1, 3, false),
      // operator 2: used prefix [0, 2), one unused above it
      mk(2, 0, true),
      mk(2, 1, true),
      mk(2, 2, false),
      // operator 3: no used keys at all
      mk(3, 0, false),
    ]);

    const stats = await storageService.getUsedKeysStatsPerOperator(address);

    expect(stats.get(1)).toEqual({ minUsed: 0, maxUsed: 2, usedCount: 3 });
    expect(stats.get(2)).toEqual({ minUsed: 0, maxUsed: 1, usedCount: 2 });
    // an operator with no used keys does not appear in the map
    expect(stats.has(3)).toBe(false);
  });
});
