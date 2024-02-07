import { StakingModule } from 'staking-router-modules/interfaces/staking-module.interface';

export interface UpdaterPayload {
  currElMeta: {
    number: number;
    hash: string;
    timestamp: number;
  };
  prevElMeta: {
    blockNumber: number;
    blockHash: string;
    timestamp: number;
    lastChangedBlockHash: string;
  } | null;
  contractModules: StakingModule[];
}

export interface UpdaterState {
  lastChangedBlockHash: string;
  isReorgDetected: boolean;
}
