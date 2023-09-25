import { AddressZero } from '@ethersproject/constants';
import { RegistryOperator } from '../common/registry';
import { curatedModule, dvtModule } from './module.fixture';

export const operatorOneCurated: RegistryOperator = {
  index: 1,
  active: true,
  name: 'test',
  rewardAddress: AddressZero,
  stoppedValidators: 0,
  stakingLimit: 1,
  usedSigningKeys: 2,
  totalSigningKeys: 3,
  moduleAddress: curatedModule.stakingModuleAddress,
};

export const operatorTwoCurated: RegistryOperator = {
  index: 2,
  active: true,
  name: 'test',
  rewardAddress: AddressZero,
  stoppedValidators: 0,
  stakingLimit: 1,
  usedSigningKeys: 2,
  totalSigningKeys: 3,
  moduleAddress: curatedModule.stakingModuleAddress,
};

export const operatorOneDvt: RegistryOperator = {
  index: 1,
  active: true,
  name: 'test',
  rewardAddress: AddressZero,
  stoppedValidators: 0,
  stakingLimit: 1,
  usedSigningKeys: 2,
  totalSigningKeys: 3,
  moduleAddress: dvtModule.stakingModuleAddress,
};

export const operatorTwoDvt: RegistryOperator = {
  index: 2,
  active: true,
  name: 'test',
  rewardAddress: AddressZero,
  stoppedValidators: 0,
  stakingLimit: 1,
  usedSigningKeys: 2,
  totalSigningKeys: 3,
  moduleAddress: dvtModule.stakingModuleAddress,
};

export const operators = [operatorOneCurated, operatorTwoCurated, operatorOneDvt, operatorTwoDvt];
