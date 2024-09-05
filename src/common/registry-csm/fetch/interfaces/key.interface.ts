export interface RegistryKey {
  index: number;
  operatorIndex: number;
  depositSignature: string;
  key: string;
  used: boolean;
  moduleAddress: string;
  vetted: boolean;
}

export type KeyBatchRecord = [string, string] & {
  keys: string;
  signatures: string;
};
