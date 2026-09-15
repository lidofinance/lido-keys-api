import { FilteredValidatorsRegistry } from './filtered-validators.registry';
import { VALIDATORS_STATUSES_FOR_EXIT } from './validators.constants';

describe('FilteredValidatorsRegistry', () => {
  it('asks the beacon node only for the statuses it stores', async () => {
    const calls: unknown[] = [];
    const consensusService = {
      getStateValidatorsStream: async (args: unknown) => {
        calls.push(args);
        return {} as NodeJS.ReadableStream;
      },
    };

    const registry = new FilteredValidatorsRegistry(consensusService as any, {} as any);
    // getValidatorsFromConsensusStream is protected; call it directly
    await (registry as any).getValidatorsFromConsensusStream('0xabc');

    expect(calls).toEqual([{ stateId: '0xabc', status: VALIDATORS_STATUSES_FOR_EXIT }]);
  });
});
