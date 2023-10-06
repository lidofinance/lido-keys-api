import { z } from 'zod';
import { BLSPubkeyHex, ValidatorIndex } from './primitives';

export enum ValidatorStatus {
  PENDING_INITIALIZED = 'pending_initialized',
  PENDING_QUEUED = 'pending_queued',
  ACTIVE_ONGOING = 'active_ongoing',
  ACTIVE_EXITING = 'active_exiting',
  ACTIVE_SLASHED = 'active_slashed',
  EXITED_UNSLASHED = 'exited_unslashed',
  EXITED_SLASHED = 'exited_slashed',
  WITHDRAWAL_POSSIBLE = 'withdrawal_possible',
  WITHDRAWAL_DONE = 'withdrawal_done',
}

export const ValidatorStatusType = z.nativeEnum(ValidatorStatus);
export type ValidatorStatusType = z.infer<typeof ValidatorStatusType>;

export const Validator = z.object(
  {
    index: ValidatorIndex,
    status: ValidatorStatusType,
    pubkey: BLSPubkeyHex,
  },
  { description: 'Validator' },
);

export type Validator = z.infer<typeof Validator>;

export const Validators = z.array(Validator);
