export interface RegistryOperator {
  index: number;
  active: boolean;
  name: string;
  rewardAddress: string;
  stakingLimit: number;
  stoppedValidators: number;
  totalSigningKeys: number;
  usedSigningKeys: number;
  moduleAddress: string;
  finalizedUsedSigningKeys: number;
  depositableValidatorsCount: number;
  // total number of withdrawn keys for the operator, exposed by the community/CSM contract
  totalWithdrawnKeys: number;
}
