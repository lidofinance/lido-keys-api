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
  // total number of withdrawn keys; real value (including 0) for compounding (0x02) community modules,
  // undefined/NULL for legacy (0x01) modules that do not expose this counter on-chain
  totalWithdrawnKeys?: number;
}
