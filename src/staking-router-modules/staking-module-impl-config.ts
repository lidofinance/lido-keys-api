import { CuratedModuleService } from './curated-module.service';
import { CommunityModuleService } from './community-module.service';
import { STAKING_MODULE_TYPE } from './constants';

export type StakingModuleImpl = typeof CuratedModuleService | typeof CommunityModuleService;

export const config: Record<STAKING_MODULE_TYPE, StakingModuleImpl> = {
  [STAKING_MODULE_TYPE.CURATED_ONCHAIN_V1_TYPE]: CuratedModuleService,
  [STAKING_MODULE_TYPE.COMMUNITY_ONCHAIN_V1_TYPE]: CommunityModuleService,
  [STAKING_MODULE_TYPE.COMMUNITY_ONCHAIN_DEVNET0_V1_TYPE]: CommunityModuleService,
  [STAKING_MODULE_TYPE.CURATED_ONCHAIN_V2_TYPE]: CommunityModuleService,
};
