import { STAKING_MODULE_TYPE } from 'staking-router-modules';

// interface of modules we get from SR contract
export interface StakingModule {
  // unique id of the staking module
  id: number;
  // address of staking module
  stakingModuleAddress: string;
  // part of the fee taken from staking rewards that goes to the staking module
  stakingModuleFee: number;
  // part of the fee taken from staking rewards that goes to the treasury
  treasuryFee: number;
  // target percent of total validators in protocol, in BP
  targetShare: number;
  // staking module status if staking module can not accept the deposits or can participate in further reward distribution
  status: number;
  // name of staking module
  name: string;
  // block.timestamp of the last deposit of the staking module
  lastDepositAt: number;
  // block.number of the last deposit of the staking module
  lastDepositBlock: number;
  // number of exited validators
  exitedValidatorsCount: number;
  // type of staking router module
  type: STAKING_MODULE_TYPE;
  // is module active
  active: boolean;
}
