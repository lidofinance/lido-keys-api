import { AddressZero } from '@ethersproject/constants';
import { RegistryOperator } from '../../fetch/interfaces/operator.interface';

export const operator = {
  active: true,
  name: 'test',
  rewardAddress: AddressZero,
  stoppedValidators: 0,
  stakingLimit: 1,
  usedSigningKeys: 2,
  totalSigningKeys: 3,
};

export const operatorFields = (operator: Partial<RegistryOperator>) => [
  operator.active,
  operator.name,
  operator.rewardAddress,
  operator.stakingLimit,
  operator.stoppedValidators,
  operator.totalSigningKeys,
  operator.usedSigningKeys,
];
