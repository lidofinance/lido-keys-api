import { STAKING_MODULE_TYPE } from '../staking-router-modules/constants';
import { StakingModuleResponse } from './common/entities';

export const curatedModuleAddressWithCheckSum = '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9';

export const curatedModuleResp: StakingModuleResponse = {
  id: 1,
  stakingModuleAddress: curatedModuleAddressWithCheckSum,
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

export const dvtModuleAddressWithChecksum = '0x0165878A594ca255338adfa4d48449f69242Eb8F';

export const dvtModuleResp: StakingModuleResponse = {
  id: 2,
  stakingModuleAddress: dvtModuleAddressWithChecksum,
  moduleFee: 100,
  treasuryFee: 100,
  targetShare: 100,
  status: 0,
  name: 'simple-dvt-onchain-v1',
  type: 'curated-onchain-v1' as STAKING_MODULE_TYPE,
  lastDepositAt: 1691500733,
  lastDepositBlock: 10,
  nonce: 1,
  exitedValidatorsCount: 0,
  active: true,
};
