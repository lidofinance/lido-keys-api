import { z } from 'zod';
import { BlockNumber, BlockTimestamp, Epoch, Hash32Hex, RootHex, Slot } from './primitives';

export const ConsensusMeta = z.object(
  {
    // consensus layer data
    epoch: Epoch,
    slot: Slot,
    slotStateRoot: RootHex,
    timestamp: BlockTimestamp,
    // execution layer data
    blockNumber: BlockNumber,
    blockHash: Hash32Hex,
  },
  { description: 'Consensus meta' },
);

export type ConsensusMeta = z.infer<typeof ConsensusMeta>;
