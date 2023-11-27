export interface RegistryKey {
  index: number;
  operatorIndex: number;
  depositSignature: string;
  key: string;
  used: boolean;
  moduleAddress: string;
}

export type KeyBatchRecord = [string, string, boolean[]] & {
  pubkeys: string;
  signatures: string;
  used: boolean[];
};
