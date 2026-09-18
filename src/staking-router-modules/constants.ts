export enum STAKING_MODULE_TYPE {
  CURATED_ONCHAIN_V1_TYPE = 'curated-onchain-v1',
  COMMUNITY_ONCHAIN_V1_TYPE = 'community-onchain-v1',
  CURATED_ONCHAIN_V2_TYPE = 'curated-onchain-v2',
}

// Withdrawal credentials prefix type of a staking module
export enum WITHDRAWAL_CREDENTIALS_TYPE {
  // 0x01 legacy withdrawal credentials
  LEGACY = 1,
  // 0x02 compounding withdrawal credentials
  COMPOUNDING = 2,
}

// Module implementation types that expose the compounding (0x02) per-operator counters
// (e.g. totalWithdrawnKeys) via the community/CSM on-chain interface
export const COMPOUNDING_CAPABLE_MODULE_TYPES: STAKING_MODULE_TYPE[] = [
  STAKING_MODULE_TYPE.COMMUNITY_ONCHAIN_V1_TYPE,
  STAKING_MODULE_TYPE.CURATED_ONCHAIN_V2_TYPE,
];
