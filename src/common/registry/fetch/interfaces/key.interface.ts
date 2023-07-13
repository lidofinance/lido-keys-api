export interface RegistryKey {
  index: number;
  operatorIndex: number;
  depositSignature: string;
  key: string;
  used: boolean;
}

export type KeyBatchRecord = [string, string, boolean[]] & {
  pubkeys: string;
  signatures: string;
  used: boolean[];
};
