import { STAKING_MODULE_TYPE } from 'staking-router-modules';

// this two objects result of KeysUpdateService.getStakingModules()
export const stakingModulesMainnet = [
  {
    id: 1,
    stakingModuleAddress: '0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5',
    stakingModuleFee: 500,
    treasuryFee: 500,
    targetShare: 10000,
    status: 0,
    name: 'NodeOperatorsRegistry',
    type: STAKING_MODULE_TYPE.CURATED_ONCHAIN_V1_TYPE,
    lastDepositAt: 1677255876,
    lastDepositBlock: 158291,
    exitedValidatorsCount: 1,
  },
];

export const stakingModulesGoerli = [
  {
    id: 1,
    stakingModuleAddress: '0x9D4AF1Ee19Dad8857db3a45B0374c81c8A1C6320',
    stakingModuleFee: 500,
    treasuryFee: 500,
    targetShare: 10000,
    status: 0,
    name: 'NodeOperatorsRegistry',
    type: STAKING_MODULE_TYPE.CURATED_ONCHAIN_V1_TYPE,
    lastDepositAt: 1677255876,
    lastDepositBlock: 158291,
    exitedValidatorsCount: 1,
  },
];

// http responses
export const stakingModulesMainnetResponse = [
  {
    id: 1,
    stakingModuleAddress: '0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5',
    moduleFee: 500,
    treasuryFee: 500,
    targetShare: 10000,
    status: 0,
    name: 'NodeOperatorsRegistry',
    type: STAKING_MODULE_TYPE.CURATED_ONCHAIN_V1_TYPE,
    lastDepositAt: 1677255876,
    lastDepositBlock: 158291,
    // exitedValidatorsCount: 1,
    nonce: 1,
  },
];

export const stakingModulesGoerliResponse = [
  {
    id: 1,
    stakingModuleAddress: '0x9D4AF1Ee19Dad8857db3a45B0374c81c8A1C6320',
    moduleFee: 500,
    treasuryFee: 500,
    targetShare: 10000,
    status: 0,
    name: 'NodeOperatorsRegistry',
    type: STAKING_MODULE_TYPE.CURATED_ONCHAIN_V1_TYPE,
    lastDepositAt: 1677255876,
    lastDepositBlock: 158291,
    // exitedValidatorsCount: 1,
    nonce: 1,
  },
];

export const curatedModuleMainnet = {
  id: 1,
  stakingModuleAddress: '0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5',
  stakingModuleFee: 500,
  treasuryFee: 500,
  targetShare: 10000,
  status: 0,
  name: 'NodeOperatorsRegistry',
  type: STAKING_MODULE_TYPE.CURATED_ONCHAIN_V1_TYPE,
  lastDepositAt: 1677255876,
  lastDepositBlock: 158291,
  exitedValidatorsCount: 1,
};

export const curatedModuleMainnetResponse = {
  id: 1,
  stakingModuleAddress: '0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5',
  moduleFee: 500,
  treasuryFee: 500,
  targetShare: 10000,
  status: 0,
  name: 'NodeOperatorsRegistry',
  type: STAKING_MODULE_TYPE.CURATED_ONCHAIN_V1_TYPE,
  lastDepositAt: 1677255876,
  lastDepositBlock: 158291,
  // exitedValidatorsCount: 1,
  nonce: 1,
};

export const curatedModuleGoerliResponse = {
  id: 1,
  stakingModuleAddress: '0x9D4AF1Ee19Dad8857db3a45B0374c81c8A1C6320',
  moduleFee: 500,
  treasuryFee: 500,
  targetShare: 10000,
  status: 0,
  name: 'NodeOperatorsRegistry',
  type: STAKING_MODULE_TYPE.CURATED_ONCHAIN_V1_TYPE,
  lastDepositAt: 1677255876,
  lastDepositBlock: 158291,
  // exitedValidatorsCount: 1,
  nonce: 1,
};

export const curatedModuleGoerli = {
  id: 1,
  stakingModuleAddress: '0x9D4AF1Ee19Dad8857db3a45B0374c81c8A1C6320',
  stakingModuleFee: 500,
  treasuryFee: 500,
  targetShare: 10000,
  status: 0,
  name: 'NodeOperatorsRegistry',
  type: STAKING_MODULE_TYPE.CURATED_ONCHAIN_V1_TYPE,
  lastDepositAt: 1677255876,
  lastDepositBlock: 158291,
  exitedValidatorsCount: 1,
};
