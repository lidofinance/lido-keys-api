import { CLBlockSnapshot, ELBlockSnapshot } from 'http/common/response-entities';

export const elMeta = {
  blockNumber: 14275000,
  blockHash: '0xc7dfcb6980e062a5267280fe13885b7f1e382f31c8bcf9c3dfc567159a3eff97',
  keysOpIndex: 1,
  timestamp: 1,
};

//For checking cases than el meta older than cl meta
export const elMetaNotSynced = {
  blockNumber: 14274999,
  blockHash: '0xc7dfcb6980e062a5267280fe13885b7f1e382f31c8bcf9c3dfc567159a3eff97',
  keysOpIndex: 1,
  timestamp: 1,
};

export const elBlockSnapshot: ELBlockSnapshot = {
  blockNumber: 14275000,
  blockHash: '0xc7dfcb6980e062a5267280fe13885b7f1e382f31c8bcf9c3dfc567159a3eff97',
  timestamp: 1,
};

export const clMeta = {
  epoch: 2860,
  slot: 34321,
  slotStateRoot: '0xc9dfcb6980e062a5267280fe13885b7f1e382f31c8bcf9c3dfc567159a3eff97',
  blockNumber: 14275000,
  blockHash: '0xc7dfcb6980e062a5267280fe13885b7f1e382f31c8bcf9c3dfc567159a3eff97',
  timestamp: 1,
};

export const clBlockSnapshot: CLBlockSnapshot = {
  epoch: 2860,
  slot: 34321,
  root: '0xc9dfcb6980e062a5267280fe13885b7f1e382f31c8bcf9c3dfc567159a3eff97',
  blockNumber: 14275000,
  blockHash: '0xc7dfcb6980e062a5267280fe13885b7f1e382f31c8bcf9c3dfc567159a3eff97',
  timestamp: 1,
};
