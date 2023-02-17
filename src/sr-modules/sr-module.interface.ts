import { Key } from './entities';

export interface AbstractModule<Op extends Operator = Operator, PKey extends Key = Key> {
  stakingModuleAddress: string;
  type: string;
  keysOpIndex: number;

  // method for updating data in database from contract
  update(blockHash: string): Promise<Metadata>;

  // methods for reading data from database
  getKeysFromStorage(): Promise<{ keys: PKey[]; meta: Metadata }>;

  getOperatorsFromStorage(): Promise<{ operators: Op[]; meta: Metadata }>;

  getKeysAndOperatorsFromStorage(): Promise<{ keys: PKey[]; operators: Op[]; meta: Metadata }>;

  getMetadataFromStorage(): Promise<Metadata>;
}
