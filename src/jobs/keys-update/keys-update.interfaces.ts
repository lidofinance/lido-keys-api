import { StakingModule } from 'staking-router-modules/interfaces/staking-module.interface';
import { ElMetaEntity } from 'storage/el-meta.entity';

export interface UpdaterPayload {
  currElMeta: {
    number: number;
    hash: string;
    timestamp: number;
  };
  prevElMeta: ElMetaEntity | null;
  contractModules: StakingModule[];
}

export interface UpdaterState {
  lastChangedBlockHash: string;
  isReorgDetected: boolean;
}
