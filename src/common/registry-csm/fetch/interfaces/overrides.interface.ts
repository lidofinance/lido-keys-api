import { CallOverrides as CallOverridesSource } from '@ethersproject/contracts';

export type BlockTagWith1898 =
  | string
  | number
  | { blockNumber: string }
  | { blockHash: string; requireCanonical?: boolean };

export interface CallOverrides extends Omit<CallOverridesSource, 'blockTag'> {
  blockTag?: BlockTagWith1898;
}
