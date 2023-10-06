import { Validator } from './validator.type';
import { ConsensusMeta } from './consensus-meta.type';
import { z } from 'zod';

export const ConsensusValidatorsAndMetadata = z.object(
  {
    validators: z.array(Validator),
    meta: z.union([ConsensusMeta, z.null()]),
  },
  { description: 'ConsensusValidatorsAndMetadata' },
);

export type ConsensusValidatorsAndMetadata = z.infer<typeof ConsensusValidatorsAndMetadata>;
