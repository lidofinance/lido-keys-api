import { RegistryKey, RegistryOperator } from 'common/registry';
import { KeysFilter, OperatorsFilter } from './filters';
import { STAKING_MODULE_TYPE } from '../constants';

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

// TODO: in future Keys = CuratedKey (RegistryKey) | CommunityKey
export type KeyEntity = RegistryKey;
export type OperatorEntity = RegistryOperator;

export interface StakingModuleInterface {
  update(moduleAddress: string, blockHash: string): Promise<void>;

  getKeysStream(moduleAddress: string, filters: KeysFilter): AsyncGenerator<KeyEntity>;

  getKeys(moduleAddress: string, filters: KeysFilter): Promise<KeyEntity[]>;

  getKeysByPubKeys(moduleAddress: string, pubKeys: string[]): Promise<KeyEntity[]>;

  getKeysByPubkey(moduleAddress: string, pubkey: string): Promise<KeyEntity[]>;

  getOperators(moduleAddress: string, filters?: OperatorsFilter): Promise<OperatorEntity[]>;

  getOperator(moduleAddress: string, index: number): Promise<OperatorEntity | null>;

  getCurrentNonce(moduleAddress: string, blockHash: string): Promise<number>;
}
