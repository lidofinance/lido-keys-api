import { CuratedModuleService } from './curated-module.service';
import { STAKING_MODULE_TYPE } from './constants';

type StakingModuleImpl = typeof CuratedModuleService;

export const config: Record<STAKING_MODULE_TYPE, StakingModuleImpl> = {
  [STAKING_MODULE_TYPE.CURATED_ONCHAIN_V1_TYPE]: CuratedModuleService,
  // In future will be added dvt staking module with the same implementation
  // now kapi will now correctly work with it as module contract address is hardcoded
  // [STAKING_MODULE_TYPE.DVT_ONCHAIN_V1_TYPE]: CuratedModuleService,
};
