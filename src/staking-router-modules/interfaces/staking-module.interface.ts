import { RegistryKey, RegistryMeta, RegistryOperator } from '@lido-nestjs/registry';
import { KeysFilter } from './keys-filter';

// Staking Module types combination

// TODO: in future Keys = CuratedKey (RegistryKey) | CommunityKey
// the problem is that libraries like @lido-nestjs/registry is in charge of implementation of
// Key and other entities. If we have library for community keys, we need to fixate somewhere general
// interface for key and have RegistryKey extends Key ..
export type KeyEntity = RegistryKey;
export type MetaEntity = RegistryMeta;
export type OperatorEntity = RegistryOperator;

export interface StakingModuleInterface {
  updateKeys(blockHashOrBlockTag: string | number): Promise<void>;

  getKeyWithMetaByPubkey(pubkey: string): Promise<{ keys: KeyEntity[]; meta: MetaEntity | null }>;

  getKeysWithMetaByPubkeys(pubkeys: string[]): Promise<{ keys: KeyEntity[]; meta: MetaEntity | null }>;

  getKeysWithMeta(filters: KeysFilter): Promise<{ keys: KeyEntity[]; meta: MetaEntity | null }>;

  getMetaDataFromStorage(): Promise<MetaEntity | null>;

  getOperatorsWithMeta(): Promise<{ operators: OperatorEntity[]; meta: MetaEntity | null }>;

  getOperatorByIndex(index: number): Promise<{ operator: OperatorEntity | null; meta: MetaEntity | null }>;

  getData(filters: KeysFilter): Promise<{
    operators: OperatorEntity[];
    keys: KeyEntity[];
    meta: MetaEntity | null;
  }>;
}
