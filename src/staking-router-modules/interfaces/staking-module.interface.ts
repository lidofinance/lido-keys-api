import { RegistryKey, RegistryMeta, RegistryOperator } from '../../common/registry';
import { KeysFilter } from './keys-filter';

// TODO: in future Keys = CuratedKey (RegistryKey) | CommunityKey
export type KeyEntity = RegistryKey;
export type MetaEntity = RegistryMeta;
export type OperatorEntity = RegistryOperator;

export interface StakingModuleInterface {
  updateKeys(blockHashOrBlockTag: string | number, contractAddress: string): Promise<void>;

  getKeysWithMeta(filters: KeysFilter): Promise<{ keys: KeyEntity[]; meta: MetaEntity | null }>;

  getKeyWithMetaByPubkey(pubkey: string): Promise<{ keys: KeyEntity[]; meta: MetaEntity | null }>;

  getKeysWithMetaByPubkeys(pubkeys: string[]): Promise<{ keys: KeyEntity[]; meta: MetaEntity | null }>;

  getMetaDataFromStorage(): Promise<MetaEntity | null>;

  getOperatorsWithMeta(): Promise<{ operators: OperatorEntity[]; meta: MetaEntity | null }>;

  getOperatorByIndex(index: number): Promise<{ operator: OperatorEntity | null; meta: MetaEntity | null }>;

  getData(filters: KeysFilter): Promise<{
    operators: OperatorEntity[];
    keys: KeyEntity[];
    meta: MetaEntity | null;
  }>;

  getCurrentNonce(blockHashOrBlockTag: string | number, contractAddress: string): Promise<number>;
}
