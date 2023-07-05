import { compareOperators } from '../../utils/operator.utils';

describe('Compare operators util', () => {
  const operatorOne = {
    index: 1,
    active: true,
    name: 'first',
    rewardAddress: '0x01',
    stakingLimit: 1,
    stoppedValidators: 0,
    totalSigningKeys: 1,
    usedSigningKeys: 1,
  };

  const operatorTwo = {
    index: 2,
    active: true,
    name: 'second',
    rewardAddress: '0x02',
    stakingLimit: 2,
    stoppedValidators: 0,
    totalSigningKeys: 2,
    usedSigningKeys: 2,
  };

  test('null - null', async () => {
    expect(compareOperators(null, null)).toBe(false);
  });

  test('null - operator', async () => {
    expect(compareOperators(null, operatorOne)).toBe(false);
  });

  test('operator - null', async () => {
    expect(compareOperators(operatorOne, null)).toBe(false);
  });

  test('operator - another operator', async () => {
    expect(compareOperators(operatorOne, operatorTwo)).toBe(false);
  });

  test('operator - same operator', async () => {
    expect(compareOperators(operatorOne, operatorOne)).toBe(true);
    expect(compareOperators(operatorTwo, operatorTwo)).toBe(true);
  });
});
