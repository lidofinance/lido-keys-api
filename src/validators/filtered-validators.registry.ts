import { Inject, Injectable } from '@nestjs/common';
import { ConsensusService } from '@lido-nestjs/consensus';
import { StorageServiceInterface, ValidatorsRegistry } from '@lido-nestjs/validators-registry';
import { VALIDATORS_STATUSES_TO_INGEST } from './validators.constants';

type StateValidatorsArgs = Parameters<ConsensusService['getStateValidatorsStream']>[0];
type BeaconValidatorStatus = NonNullable<StateValidatorsArgs['status']>[number];

// the enum values are the beacon API status strings, but TypeScript keeps the two types apart
const STATUS_FILTER = VALIDATORS_STATUSES_TO_INGEST as BeaconValidatorStatus[];

/**
 * Asks the beacon node only for the statuses the API can return.
 *
 * Without the filter the node serialises its whole validator set (~1 GB on mainnet).
 * Nimbus blocks its event loop while doing that, so other REST calls queue up and
 * validator clients miss duties.
 *
 * Only `updateStream()` is filtered, which is the path the update job uses. The base
 * class `update()` still fetches every validator and is left for tests alone.
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
