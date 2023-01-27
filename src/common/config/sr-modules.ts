import { CHAINS } from '@lido-nestjs/constants';

export type SRModule = {
  id: number;
  stakingModuleAddress: string;
  name: string;
  type: string;
};

export const GROUPED_ONCHAIN_V1_TYPE = 'grouped-onchain-v1';

// current srModules contains all modules we know at the moment and all info about them
// after staking router deploy we will get this list of modules from contract with these functions:
// function getStakingModulesCount() external view returns (uint256);
// function getStakingModule(uint24 _stakingModuleId) external view returns (StakingModule memory);
// we should have list of types somewhere and compare with modules list from staking router
// if Keys API doesn't know how to work with some module we should throw error and stop
export const srModules: Record<number, SRModule[]> = {
  [CHAINS.Mainnet]: [
    {
      id: 1,
      stakingModuleAddress: '0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5',
      name: 'NodeOperatorRegistry',
      type: GROUPED_ONCHAIN_V1_TYPE,
      // moduleFee: undefined,
      // tresuryFee: undefined,
      // tragetShare: undefined,
      // status: undefined,
      // lastDepositAt: undefined,
      // lastDepositBlock: undefined,
    },
  ],
  [CHAINS.Goerli]: [
    {
      id: 1,
      stakingModuleAddress: '0x9D4AF1Ee19Dad8857db3a45B0374c81c8A1C6320',
      name: 'NodeOperatorRegistry',
      type: GROUPED_ONCHAIN_V1_TYPE,
    },
  ],
};
