import { RegistryOperator } from '@lido-nestjs/registry';

// operators that return library
export const curatedOperators: RegistryOperator[] = [
  {
    index: 1,
    active: true,
    name: 'test',
    rewardAddress: '0x0000000000000000000000000000000000000000',
    stoppedValidators: 0,
    stakingLimit: 1,
    usedSigningKeys: 2,
    totalSigningKeys: 3,
  },

  {
    index: 2,
    active: true,
    name: 'test',
    rewardAddress: '0x0000000000000000000000000000000000000001',
    stoppedValidators: 0,
    stakingLimit: 1,
    usedSigningKeys: 2,
    totalSigningKeys: 3,
  },
];

// Currently our response the same as response of library
export const expectedOperatorsResponse = curatedOperators;

export const curatedOperatorIndexOne = {
  index: 1,
  active: true,
  name: 'test',
  rewardAddress: '0x0000000000000000000000000000000000000000',
  stoppedValidators: 0,
  stakingLimit: 1,
  usedSigningKeys: 2,
  totalSigningKeys: 3,
};

export const expectedOperatorIndexOne = curatedOperatorIndexOne;
