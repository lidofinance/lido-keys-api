import { Inject, Injectable } from '@nestjs/common';
import { ConsensusService } from '@lido-nestjs/consensus';
import { StorageServiceInterface, ValidatorsRegistry } from '@lido-nestjs/validators-registry';
import { VALIDATORS_STATUSES_FOR_EXIT } from './validators.constants';

type StateValidatorsArgs = Parameters<ConsensusService['getStateValidatorsStream']>[0];
type BeaconValidatorStatus = NonNullable<StateValidatorsArgs['status']>[number];

// the enum values are the beacon API status strings, but TypeScript keeps the two types apart
const STATUS_FILTER = VALIDATORS_STATUSES_FOR_EXIT as BeaconValidatorStatus[];

/**
 * Asks the beacon node only for the statuses the API can return, instead of its whole
 * validator set (~1 GB on mainnet).
 *
 * Only `updateStream()` is filtered; the base class `update()` still fetches everything.
 */
@Injectable()
export class FilteredValidatorsRegistry extends ValidatorsRegistry {
  constructor(
    consensusService: ConsensusService,
    @Inject(StorageServiceInterface) storageService: StorageServiceInterface,
  ) {
    super(consensusService, storageService);
  }

  protected async getValidatorsFromConsensusStream(slotRoot: string): Promise<NodeJS.ReadableStream> {
    return this.consensusService.getStateValidatorsStream({
      stateId: slotRoot,
      status: STATUS_FILTER,
    });
  }
}
