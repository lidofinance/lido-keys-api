import { Test } from '@nestjs/testing';
import { IsolationLevel, MikroORM } from '@mikro-orm/core';
import { key } from '../fixtures/key.fixture';
import { RegistryStorageModule, RegistryStorageService, RegistryKeyStorageService, RegistryKey } from '../..';
import { LIDO_LOCATOR_CONTRACT_ADDRESSES } from 'common/contracts';
import { LidoLocator__factory, StakingRouter__factory } from 'generated';
import * as dotenv from 'dotenv';
import { DatabaseE2ETestingModule } from 'app';
import { EntityManager } from '@mikro-orm/knex';
import { JsonRpcBatchProvider } from '@ethersproject/providers';

dotenv.config();

describe('check that findAsStream method dont create a new connection', () => {
  let keyStorageService: RegistryKeyStorageService;
  let registryService: RegistryStorageService;
  let entityManager: EntityManager;
  let address;

  if (!process.env.CHAIN_ID) {
    console.error("CHAIN_ID wasn't provides");
    process.exit(1);
  }
  const chainId = process.env.CHAIN_ID as any;

  beforeEach(async () => {
    const imports = [
      DatabaseE2ETestingModule.forRoot({ pool: { min: 1, max: 1 } }),
      RegistryStorageModule.forFeature(),
    ];

    const provider = new JsonRpcBatchProvider(process.env.PROVIDERS_URLS);
    const locatorAddress = LIDO_LOCATOR_CONTRACT_ADDRESSES[chainId];
    const locator = LidoLocator__factory.connect(locatorAddress, provider);
    const stakingRouterAddress = await locator.stakingRouter();
    const stakingRouter = StakingRouter__factory.connect(stakingRouterAddress, provider);
    const modules = await stakingRouter.getStakingModules();
    address = modules[0].stakingModuleAddress.toLowerCase();

    const moduleRef = await Test.createTestingModule({ imports }).compile();
    keyStorageService = moduleRef.get(RegistryKeyStorageService);
    registryService = moduleRef.get(RegistryStorageService);
    entityManager = moduleRef.get(EntityManager);

    const generator = moduleRef.get(MikroORM).getSchemaGenerator();
    await generator.refreshDatabase();
    await generator.clearDatabase();
  });

  afterEach(async () => {
    await registryService.onModuleDestroy();
  });

  it('should return list of keys', async () => {
    const keys = [
      { operatorIndex: 1, index: 1, moduleAddress: address, ...key, vetted: true },
      { operatorIndex: 2, index: 2, moduleAddress: address, ...key, vetted: true },
    ];
    await keyStorageService.save(keys);

    const where = {};

    const fields = [
      'index',
      'operator_index as operatorIndex',
      'key',
      'deposit_signature as depositSignature',
      'used',
      'module_address as moduleAddress',
      'vetted',
    ];

    await entityManager.transactional(
      async () => {
        const stream = keyStorageService.findAsStream(where, fields);

        const result: RegistryKey[] = [];
        for await (const key of stream) {
          result.push(key);
        }

        expect(result.length).toEqual(keys.length);
        expect(result).toEqual(expect.arrayContaining(keys));
      },
      { isolationLevel: IsolationLevel.REPEATABLE_READ },
    );
  }, 10000);
});
