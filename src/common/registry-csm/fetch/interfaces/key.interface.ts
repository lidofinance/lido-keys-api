export interface RegistryKey {
  index: number;
  operatorIndex: number;
  depositSignature: string;
  key: string;
  used: boolean;
  moduleAddress: string;
}

export type KeyBatchRecord = [string, string] & {
  keys: string;
  signatures: string;
};
