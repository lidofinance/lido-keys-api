import { ValidatorStatus } from '@lido-nestjs/validators-registry';

// statuses FilteredValidatorsRegistry asks the CL for and stores. everything else is dropped.
export const VALIDATORS_STATUSES_TO_INGEST = [
  ValidatorStatus.ACTIVE_ONGOING,
  ValidatorStatus.PENDING_INITIALIZED,
  ValidatorStatus.PENDING_QUEUED,
];

// must stay a subset of VALIDATORS_STATUSES_TO_INGEST, or the exit endpoints return nothing
// for the missing statuses. filtered-validators.registry.spec.ts checks this.
export const VALIDATORS_STATUSES_FOR_EXIT = [
  ValidatorStatus.ACTIVE_ONGOING,
  ValidatorStatus.PENDING_INITIALIZED,
  ValidatorStatus.PENDING_QUEUED,
];

export const DEFAULT_EXIT_PERCENT = 10;

export const VALIDATORS_REGISTRY_DISABLED_ERROR = 'Validators Registry is disabled. Check environment variables';
