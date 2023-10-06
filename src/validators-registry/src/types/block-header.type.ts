import { z } from 'zod';
import { RootHex, Slot } from './primitives';

export const BlockHeader = z.object(
  {
    root: RootHex,
    slot: Slot,
  },
  { description: 'BlockHeader' },
);
export type BlockHeader = z.infer<typeof BlockHeader>;
