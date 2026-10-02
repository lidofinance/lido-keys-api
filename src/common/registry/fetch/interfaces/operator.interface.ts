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
  // total number of withdrawn keys; real value (including 0) for modules of the community/CSM implementation,
  // undefined/NULL for curated (NOR) modules that do not expose this counter on-chain
  totalWithdrawnKeys?: number;
}
