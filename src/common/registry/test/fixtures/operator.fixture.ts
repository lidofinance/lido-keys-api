import { AddressZero } from '@ethersproject/constants';
import { RegistryOperator } from '../../fetch/interfaces/operator.interface';

export const operator = {
  active: true,
  name: 'test',
  rewardAddress: AddressZero,
  stoppedValidators: 0,
  stakingLimit: 2,
  usedSigningKeys: 2,
  totalSigningKeys: 3,
  finalizedUsedSigningKeys: 2,
  depositableValidatorsCount: 1,
};

export const operatorSummary = {
  targetLimitMode: 0,
  targetValidatorsCount: 0,
  stuckValidatorsCount: 0,
  refundedValidatorsCount: 0,
  stuckPenaltyEndTimestamp: 0,
  totalExitedValidators: 0,
  totalDepositedValidators: 2,
  depositableValidatorsCount: 1,
};

export const operatorSummaryFields = (summary: typeof operatorSummary) => [
  summary.targetLimitMode,
  summary.targetValidatorsCount,
  summary.stuckValidatorsCount,
  summary.refundedValidatorsCount,
  summary.stuckPenaltyEndTimestamp,
  summary.totalExitedValidators,
  summary.totalDepositedValidators,
  summary.depositableValidatorsCount,
];

export const operatorFields = (operator: Partial<RegistryOperator>) => [
  operator.active,
  operator.name,
  operator.rewardAddress,
  operator.stakingLimit,
  operator.stoppedValidators,
  operator.totalSigningKeys,
  operator.usedSigningKeys,
];
