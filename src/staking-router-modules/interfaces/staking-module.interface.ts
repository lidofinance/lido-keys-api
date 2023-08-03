import { RegistryKey, RegistryOperator } from 'common/registry';
import { KeyField } from './key-fields';
import { KeysFilter } from './keys-filter';
import { OperatorsFilter } from './operators-filter';

// TODO: in future Keys = CuratedKey (RegistryKey) | CommunityKey
export type KeyEntity = RegistryKey;
export type OperatorEntity = RegistryOperator;

export interface StakingModuleInterface {
  // TODO: moduleAddress - first arg
  update(moduleAddress: string, blockHash: string): Promise<void>;

  getKeysStream(
    moduleAddress: string,
    filters: KeysFilter,
    fields?: readonly KeyField[] | undefined,
  ): AsyncGenerator<KeyEntity>;

  getKeys(moduleAddress: string, filters: KeysFilter, fields?: readonly KeyField[] | undefined): Promise<KeyEntity[]>;

  getKeysByPubKeys(
    moduleAddress: string,
    pubKeys: string[],
    fields?: readonly KeyField[] | undefined,
  ): Promise<KeyEntity[]>;

  getKeysByPubkey(
    moduleAddress: string,
    pubkey: string,
    fields?: readonly KeyField[] | undefined,
  ): Promise<KeyEntity[]>;

  getOperators(moduleAddress: string, filters?: OperatorsFilter): Promise<OperatorEntity[]>;

  getOperator(moduleAddress: string, index: number): Promise<OperatorEntity | null>;

  getCurrentNonce(moduleAddress: string, blockHash: string): Promise<number>;
}
