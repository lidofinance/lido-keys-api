import { CHAINS } from './chains';
import { StakingRouterModule, StakingRouterModuleType } from 'http/staking-router-modules/entities';

export const stakingRouterModules: {
  [chainId: number]: StakingRouterModule[];
} = {
  [CHAINS.Mainnet]: [
    {
      address: '0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5',
      description: 'NodeOperatorRegistry contract',
      type: StakingRouterModuleType.CURATED,
    },
  ],
  [CHAINS.Goerli]: [
    {
      address: '0x9D4AF1Ee19Dad8857db3a45B0374c81c8A1C6320',
      description: 'NodeOperatorRegistry contract',
      type: StakingRouterModuleType.CURATED,
    },
  ],
};
