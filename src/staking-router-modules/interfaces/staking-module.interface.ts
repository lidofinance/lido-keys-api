import { RegistryKey, RegistryMeta, RegistryOperator } from '@lido-nestjs/registry';
import { KeysFilter } from './keys-filter';

// Staking Module types combination
type Key = RegistryKey;
type Meta = RegistryMeta;
type Operator = RegistryOperator;

export interface StakingModuleInterface {
  updateKeys(blockHashOrBlockTag: string | number): Promise<void>;

  getKeyWithMetaByPubkey(pubkey: string): Promise<{ keys: Key[]; meta: Meta | null }>;

  getKeysWithMetaByPubkeys(pubkeys: string[]): Promise<{ keys: Key[]; meta: Meta | null }>;

  getKeysWithMeta(filters: KeysFilter): Promise<{ keys: Key[]; meta: Meta | null }>;

  getMetaDataFromStorage(): Promise<Meta | null>;

  getOperatorsWithMeta(): Promise<{ operators: Operator[]; meta: Meta | null }>;

  getOperatorByIndex(index: number): Promise<{ operator: Operator | null; meta: Meta | null }>;

  getData(filters: KeysFilter): Promise<{
    operators: Operator[];
    keys: Key[];
    meta: Meta | null;
  }>;
}
