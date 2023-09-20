import { StakingModule } from '../staking-router-modules/interfaces/staking-module.interface';
import { STAKING_MODULE_TYPE } from '../staking-router-modules/constants';
import { StakingModuleResponse } from './common/entities';

export const curatedModule: StakingModule = {
  moduleId: 1,
  stakingModuleAddress: '0xdc64a140aa3e981100a9beca4e685f962f0cf6c9',
  moduleFee: 100,
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

export const dvtModule: StakingModule = {
  moduleId: 2,
  stakingModuleAddress: '0x0165878a594ca255338adfa4d48449f69242eb8f',
  moduleFee: 100,
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

export const curatedModuleResp: StakingModuleResponse = {
  id: 1,
  stakingModuleAddress: '0xdc64a140aa3e981100a9beca4e685f962f0cf6c9',
  moduleFee: 100,
  treasuryFee: 100,
  targetShare: 100,
  status: 0,
  name: 'curated-onchain-v1',
  type: 'curated-onchain-v1' as STAKING_MODULE_TYPE,
  lastDepositAt: 1691500732,
  lastDepositBlock: 9,
  nonce: 1,
  exitedValidatorsCount: 0,
  active: true,
};

export const dvtModuleResp: StakingModuleResponse = {
  id: 2,
  stakingModuleAddress: '0x0165878a594ca255338adfa4d48449f69242eb8f',
  moduleFee: 100,
  treasuryFee: 100,
  targetShare: 100,
  status: 0,
  name: 'simple-dvt-onchain-v1',
  type: 'simple-dvt-onchain-v1' as STAKING_MODULE_TYPE,
  lastDepositAt: 1691500733,
  lastDepositBlock: 10,
  nonce: 1,
  exitedValidatorsCount: 0,
  active: true,
};
