import { CuratedModuleService } from './curated-module.service';
import { STAKING_MODULE_TYPE } from './interfaces/staking-module-type';

// at the moment consider that type is unique for contract address and chain id
export const config = {
  [STAKING_MODULE_TYPE.CURATED_ONCHAIN_V1_TYPE]: CuratedModuleService,
  // In future will be added dvt staking module with the same implementation
  // now kapi will now correctly work with it as module contract address is hardcoded
  // [STAKING_MODULE_TYPE.DVT_ONCHAIN_V1_TYPE]: CuratedModuleService,
};
