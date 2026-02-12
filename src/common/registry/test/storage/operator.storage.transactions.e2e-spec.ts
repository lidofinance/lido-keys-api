import { Test } from '@nestjs/testing';
import { IsolationLevel, MikroORM } from '@mikro-orm/core';
import { operator } from '../fixtures/operator.fixture';
import { RegistryStorageModule, RegistryStorageService, RegistryOperatorStorageService, RegistryOperator } from '../..';
import { LIDO_LOCATOR_CONTRACT_ADDRESSES } from 'common/contracts';
import { LidoLocator__factory, StakingRouter__factory } from 'generated';
import * as dotenv from 'dotenv';
import { DatabaseE2ETestingModule } from 'app';
import { EntityManager } from '@mikro-orm/knex';
import { JsonRpcBatchProvider } from '@ethersproject/providers';

dotenv.config();

describe('check that findAsStream method dont create a new connection', () => {
  let operatorStorageService: RegistryOperatorStorageService;
  let registryService: RegistryStorageService;
  let entityManager: EntityManager;
  let address;

  if (!process.env.CHAIN_ID) {
    console.error("CHAIN_ID wasn't provides");
    process.exit(1);
  }
  const chainId = process.env.CHAIN_ID as any;

  beforeEach(async () => {
    const provider = new JsonRpcBatchProvider(process.env.PROVIDERS_URLS);
    const locatorAddress = LIDO_LOCATOR_CONTRACT_ADDRESSES[chainId];
    const locator = LidoLocator__factory.connect(locatorAddress, provider);
    const stakingRouterAddress = await locator.stakingRouter();
    const stakingRouter = StakingRouter__factory.connect(stakingRouterAddress, provider);
    const modules = await stakingRouter.getStakingModules();
    address = modules[0].stakingModuleAddress.toLowerCase();

    const imports = [
      DatabaseE2ETestingModule.forRoot({ pool: { min: 1, max: 1 } }),
      RegistryStorageModule.forFeature(),
    ];

    const moduleRef = await Test.createTestingModule({ imports }).compile();
    operatorStorageService = moduleRef.get(RegistryOperatorStorageService);
    registryService = moduleRef.get(RegistryStorageService);
    entityManager = moduleRef.get(EntityManager);

    const generator = moduleRef.get(MikroORM).getSchemaGenerator();
    await generator.refreshDatabase();
    await generator.clearDatabase();
  });

  afterEach(async () => {
    await registryService.onModuleDestroy();
  });

  it('should return list of operators', async () => {
    const operators = [
      { index: 1, moduleAddress: address, ...operator },
      { index: 2, moduleAddress: address, ...operator },
    ];

    await operatorStorageService.save(operators);

    const where = {};

    const fields = [
      'index',
      'active',
      'name',
      'finalized_used_signing_keys as finalizedUsedSigningKeys',
      'reward_address as rewardAddress',
      'staking_limit as stakingLimit',
      'stopped_validators as stoppedValidators',
      'total_signing_keys as totalSigningKeys',
      'used_signing_keys as usedSigningKeys',
      'module_address as moduleAddress',
    ];

    await entityManager.transactional(
      async () => {
        const stream = operatorStorageService.findAsStream(where, fields);

        const result: RegistryOperator[] = [];
        for await (const key of stream) {
          result.push(key);
        }

        expect(result.length).toEqual(operators.length);
        expect(result).toEqual(expect.arrayContaining(operators));
      },
      { isolationLevel: IsolationLevel.REPEATABLE_READ },
    );
  }, 10000);
});
