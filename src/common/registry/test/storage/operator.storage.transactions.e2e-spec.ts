import { Test } from '@nestjs/testing';
import { IsolationLevel, MikroORM } from '@mikro-orm/core';
import { operator } from '../fixtures/operator.fixture';
import { RegistryStorageModule, RegistryStorageService, RegistryOperatorStorageService, RegistryOperator } from '../..';
import { REGISTRY_CONTRACT_ADDRESSES } from '@lido-nestjs/contracts';
import * as dotenv from 'dotenv';
import { DatabaseTestingModule } from 'app';
import { EntityManager } from '@mikro-orm/knex';

dotenv.config();

describe('check that findAsStream method dont create a new connection', () => {
  let operatorStorageService: RegistryOperatorStorageService;
  let registryService: RegistryStorageService;
  let entityManager: EntityManager;

  if (!process.env.CHAIN_ID) {
    console.error("CHAIN_ID wasn't provides");
    process.exit(1);
  }
  const address = REGISTRY_CONTRACT_ADDRESSES[process.env.CHAIN_ID];

  beforeEach(async () => {
    const imports = [DatabaseTestingModule.forRoot({ pool: { min: 1, max: 1 } }), RegistryStorageModule.forFeature()];

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
