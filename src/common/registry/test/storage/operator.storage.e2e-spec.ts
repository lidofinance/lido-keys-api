import { Test } from '@nestjs/testing';
import { MikroORM, QueryOrder } from '@mikro-orm/core';
import { operator } from '../fixtures/operator.fixture';
import { RegistryStorageModule, RegistryStorageService, RegistryOperatorStorageService } from '../../';
import { LIDO_LOCATOR_CONTRACT_ADDRESSES } from 'common/contracts';
import { LidoLocator__factory, StakingRouter__factory } from 'generated';
import * as dotenv from 'dotenv';
import { DatabaseE2ETestingModule } from 'app';
import { JsonRpcBatchProvider } from '@ethersproject/providers';

dotenv.config();

describe('Operators', () => {
  let storageService: RegistryOperatorStorageService;
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
    storageService = moduleRef.get(RegistryOperatorStorageService);
    registryService = moduleRef.get(RegistryStorageService);

    const generator = moduleRef.get(MikroORM).getSchemaGenerator();
    await generator.refreshDatabase();
    await generator.clearDatabase();
  });

  afterEach(async () => {
    await registryService.onModuleDestroy();
  });

  test('find', async () => {
    const operators = [
      { index: 1, moduleAddress: address, ...operator },
      { index: 2, moduleAddress: address, ...operator },
    ];

    await expect(storageService.findAll(address)).resolves.toEqual([]);
    await storageService.save(operators);
    await expect(
      storageService.find({ active: true }, { limit: 1, orderBy: { index: QueryOrder.DESC } }),
    ).resolves.toEqual([operators[1]]);
  });

  test('save one operator', async () => {
    const registryOperator = { index: 1, moduleAddress: address, ...operator };

    await expect(storageService.findAll(address)).resolves.toEqual([]);
    await storageService.saveOne(registryOperator);
    await expect(storageService.findAll(address)).resolves.toEqual([registryOperator]);
  });

  test('save operators', async () => {
    const operators = [
      { index: 1, moduleAddress: address, ...operator },
      { index: 2, moduleAddress: address, ...operator },
    ];

    await expect(storageService.findAll(address)).resolves.toEqual([]);
    await storageService.save(operators);
    await expect(storageService.findAll(address)).resolves.toEqual(operators);
  });

  test('remove one operator', async () => {
    const registryOperator = { index: 1, moduleAddress: address, ...operator };

    await expect(storageService.findAll(address)).resolves.toEqual([]);
    await storageService.saveOne(registryOperator);
    await expect(storageService.findAll(address)).resolves.toEqual([registryOperator]);
    await storageService.removeOneByIndex(address, registryOperator.index);
    await expect(storageService.findAll(address)).resolves.toEqual([]);
  });

  test('remove all operators', async () => {
    const operators = [
      { index: 1, moduleAddress: address, ...operator },
      { index: 2, moduleAddress: address, ...operator },
    ];

    await expect(storageService.findAll(address)).resolves.toEqual([]);
    await storageService.save(operators);
    await expect(storageService.findAll(address)).resolves.toEqual(operators);
    await storageService.removeAll();
    await expect(storageService.findAll(address)).resolves.toEqual([]);
  });
});
