import { RegistryKey, RegistryMeta, RegistryOperator } from '../../common/registry';
import { KeysFilter } from './keys-filter';
import { OperatorsFilter } from './operators-filter';

// TODO: in future Keys = CuratedKey (RegistryKey) | CommunityKey
export type KeyEntity = RegistryKey;
export type MetaEntity = RegistryMeta;
export type OperatorEntity = RegistryOperator;

export interface StakingModuleInterface {
  // TODO: moduleAddress - first arg
  update(blockHash: string, moduleAddress: string): Promise<void>;
  // this method, operators and nonce
  getKeys(filters: KeysFilter, moduleAddress: string, options?): Promise<KeyEntity[]>;

  getKeysByPubKeys(pubKeys: string[], moduleAddress: string, options?): Promise<KeyEntity[]>;

  getKeysByPubkey(pubkey: string, moduleAddress: string, options?): Promise<KeyEntity[]>;

  getOperators(moduleAddress: string, filters: OperatorsFilter): Promise<OperatorEntity[]>;

  getOperator(index: number, moduleAddress: string): Promise<OperatorEntity | null>;

  getCurrentNonce(blockHash: string, moduleAddress: string): Promise<number>;
}
