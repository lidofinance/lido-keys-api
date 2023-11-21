import { RegistryKey, RegistryOperator } from 'common/registry';
import { KeysFilter, OperatorsFilter } from './filters';

// interface of modules we get from SR contract
export interface StakingModule {
  // unique id of the staking module
  moduleId: number;
  // address of staking module
  stakingModuleAddress: string;
  // part of the fee taken from staking rewards that goes to the staking module
  moduleFee: number;
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
  type: string; //STAKING_MODULE_TYPE;
  // is module active
  active: boolean;
}

export interface StakingModuleInterface {
  update(moduleAddress: string, blockHash: string): Promise<void>;

  operatorsWereChanged(moduleAddress: string, fromBlockNumber: number, toBlockNumber: number): Promise<boolean>;

  updateOperators(moduleAddress: string, blockHash: string): Promise<void>;

  getKeysStream(moduleAddress: string, filters: KeysFilter): AsyncGenerator<RegistryKey>;

  getKeys(moduleAddress: string, filters: KeysFilter): Promise<RegistryKey[]>;

  getKeysByPubKeys(moduleAddress: string, pubKeys: string[]): Promise<RegistryKey[]>;

  getKeysByPubkey(moduleAddress: string, pubkey: string): Promise<RegistryKey[]>;

  getOperators(moduleAddress: string, filters?: OperatorsFilter): Promise<RegistryOperator[]>;

  getOperatorsStream(moduleAddress: string, filters?: OperatorsFilter): AsyncGenerator<RegistryOperator>;

  getOperator(moduleAddress: string, index: number): Promise<RegistryOperator | null>;

  getCurrentNonce(moduleAddress: string, blockHash: string): Promise<number>;
}
