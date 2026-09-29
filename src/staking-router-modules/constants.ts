export enum STAKING_MODULE_TYPE {
  CURATED_ONCHAIN_V1_TYPE = 'curated-onchain-v1',
  COMMUNITY_ONCHAIN_V1_TYPE = 'community-onchain-v1',
  CURATED_ONCHAIN_V2_TYPE = 'curated-onchain-v2',
}

// Module implementation types served by the community/CSM on-chain interface,
// which exposes per-operator totalWithdrawnKeys
export const WITHDRAWN_KEYS_CAPABLE_MODULE_TYPES: STAKING_MODULE_TYPE[] = [
  STAKING_MODULE_TYPE.COMMUNITY_ONCHAIN_V1_TYPE,
  STAKING_MODULE_TYPE.CURATED_ONCHAIN_V2_TYPE,
];
