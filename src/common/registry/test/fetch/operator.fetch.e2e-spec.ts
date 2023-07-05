import { Test } from '@nestjs/testing';
import { getDefaultProvider } from '@ethersproject/providers';
import { isAddress } from '@ethersproject/address';
import { RegistryFetchModule, RegistryOperatorFetchService } from '../../';

describe('Operators', () => {
  const provider = getDefaultProvider(process.env.EL_RPC_URL);
  let fetchService: RegistryOperatorFetchService;

  beforeEach(async () => {
    const imports = [RegistryFetchModule.forFeature({ provider })];
    const moduleRef = await Test.createTestingModule({ imports }).compile();
    fetchService = moduleRef.get(RegistryOperatorFetchService);
  });

  test('count', async () => {
    const count = await fetchService.count();
    expect(typeof count).toBe('number');
    expect(count).toBeGreaterThan(0);
  });

  test('fetch one operator', async () => {
    const operator = await fetchService.fetchOne(0);

    expect(operator).toBeInstanceOf(Object);
    expect(typeof operator.active).toBe('boolean');

    expect(typeof operator.index).toBe('number');
    expect(typeof operator.stakingLimit).toBe('number');
    expect(typeof operator.stoppedValidators).toBe('number');
    expect(typeof operator.totalSigningKeys).toBe('number');
    expect(typeof operator.usedSigningKeys).toBe('number');

    expect(typeof operator.name).toBe('string');
    expect(isAddress(operator.rewardAddress)).toBe(true);
  });

  test('fetch all operators', async () => {
    const operators = await fetchService.fetch();

    expect(operators).toBeInstanceOf(Array);
    expect(operators.length).toBeGreaterThan(0);
  });

  test('fetch multiply operators', async () => {
    const operators = await fetchService.fetch(1, 3);

    expect(operators).toBeInstanceOf(Array);
    expect(operators.length).toBe(2);
    expect(operators[0].index).toBe(1);
    expect(operators[1].index).toBe(2);
  });
});
