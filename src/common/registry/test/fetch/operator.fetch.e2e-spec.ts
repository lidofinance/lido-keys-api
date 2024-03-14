import { Test } from '@nestjs/testing';
import { getDefaultProvider } from '@ethersproject/providers';
import { isAddress } from '@ethersproject/address';
import { RegistryFetchModule, RegistryOperatorFetchService } from '../../';
import { REGISTRY_CONTRACT_ADDRESSES } from '@lido-nestjs/contracts';
import * as dotenv from 'dotenv';
import { LoggerModule, nullTransport } from '@lido-nestjs/logger';

dotenv.config();

describe('Operators', () => {
  const provider = getDefaultProvider(process.env.PROVIDERS_URLS);
  if (!process.env.CHAIN_ID) {
    console.error(process.env.CHAIN_ID, process.env.PROVIDERS_URLS, "CHAIN_ID wasn't provides");
    process.exit(1);
  }
  const address = REGISTRY_CONTRACT_ADDRESSES[process.env.CHAIN_ID];

  let fetchService: RegistryOperatorFetchService;

  beforeEach(async () => {
    const imports = [
      RegistryFetchModule.forFeature({ provider }),
      LoggerModule.forRoot({ transports: [nullTransport()] }),
    ];
    const moduleRef = await Test.createTestingModule({ imports }).compile();
    fetchService = moduleRef.get(RegistryOperatorFetchService);
  });

  test('count', async () => {
    const count = await fetchService.count(address);
    expect(typeof count).toBe('number');
    expect(count).toBeGreaterThan(0);
  });

  test('fetch one operator', async () => {
    const operator = await fetchService.fetchOne(address, 0);

    expect(operator).toBeInstanceOf(Object);
    expect(typeof operator.active).toBe('boolean');

    expect(typeof operator.index).toBe('number');
    expect(typeof operator.stakingLimit).toBe('number');
    expect(typeof operator.stoppedValidators).toBe('number');
    expect(typeof operator.totalSigningKeys).toBe('number');
    expect(typeof operator.usedSigningKeys).toBe('number');

    expect(typeof operator.name).toBe('string');
    expect(isAddress(operator.rewardAddress)).toBe(true);
    expect(isAddress(operator.moduleAddress)).toBe(true);
  });

  test('fetch all operators', async () => {
    const operators = await fetchService.fetch(address, 0, -1, {
      blockTag: 10573030,
    });

    expect(operators).toBeInstanceOf(Array);
    expect(operators.length).toBeGreaterThan(0);
  }, 30_000);

  test('fetch multiply operators', async () => {
    const operators = await fetchService.fetch(address, 1, 3, {
      blockTag: 10573030,
    });

    expect(operators).toBeInstanceOf(Array);
    expect(operators.length).toBe(2);
    expect(operators[0].index).toBe(1);
    expect(operators[1].index).toBe(2);
  });
});
