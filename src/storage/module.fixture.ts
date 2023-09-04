import { STAKING_MODULE_TYPE } from 'staking-router-modules/constants';

export const curatedModule = {
  id: 1,
  stakingModuleAddress: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
  stakingModuleFee: 100,
  treasuryFee: 100,
  targetShare: 100,
  status: 0,
  name: 'curated-onchain-v1',
  type: 'curated-onchain-v1' as STAKING_MODULE_TYPE,
  lastDepositAt: 1691500732,
  lastDepositBlock: 9,
  exitedValidatorsCount: 0,
  active: true,
};

export const dvtModule = {
  id: 2,
  stakingModuleAddress: '0x0165878A594ca255338adfa4d48449f69242Eb8F',
  stakingModuleFee: 100,
  treasuryFee: 100,
  targetShare: 100,
  status: 0,
  name: 'simple-dvt-onchain-v1',
  type: 'simple-dvt-onchain-v1' as STAKING_MODULE_TYPE,
  lastDepositAt: 1691500733,
  lastDepositBlock: 10,
  exitedValidatorsCount: 0,
  active: true,
};

export const srModules = [curatedModule, dvtModule];
