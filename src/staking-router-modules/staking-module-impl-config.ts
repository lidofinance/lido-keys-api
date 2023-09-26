import { CuratedModuleService } from './curated-module.service';
import { STAKING_MODULE_TYPE } from './constants';

export type StakingModuleImpl = typeof CuratedModuleService;

export const config: Record<STAKING_MODULE_TYPE, StakingModuleImpl> = {
  [STAKING_MODULE_TYPE.CURATED_ONCHAIN_V1_TYPE]: CuratedModuleService,
  [STAKING_MODULE_TYPE.SIMPLE_DVT_ONCHAIN_V1_TYPE]: CuratedModuleService,
};
