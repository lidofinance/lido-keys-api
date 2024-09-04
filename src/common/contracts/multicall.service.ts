import { Injectable } from '@nestjs/common';
import { ExecutionProvider } from 'common/execution-provider';
import { Multicall__factory } from 'generated';
import { Multicall3 } from 'generated/Multicall';
import { MULTICALL_ADDRESS } from './constants';

import { CallOverrides } from '../registry/fetch/interfaces/overrides.interface';

@Injectable()
export class MulticallService {
  // TODO: use config
  MULTICALL_BATCH_SIZE = 20;

  constructor(protected readonly provider: ExecutionProvider) {}

  private async contract() {
    const network = await this.provider.getNetwork();
    network.chainId;
    return Multicall__factory.connect(MULTICALL_ADDRESS[network.chainId], this.provider);
  }

  public async aggregateInBatch(calls: Multicall3.Call3Struct[], overrides: CallOverrides) {
    // overrides: { blockTag: string | number }) {
    const aggregateFunctions = await this.createCallsBatchFunctions(calls, overrides);
    const results = await this.executeAggregateBatches(aggregateFunctions, 20);

    return results.flat();
  }

  /**
   *
   * @param calls
   * @param overrides
   */
  async createCallsBatchFunctions(
    calls: Multicall3.Call3Struct[],
    overrides: CallOverrides, // { blockTag: string | number },
  ): Promise<(() => Promise<Multicall3.ResultStructOutput[]>)[]> {
    const aggregateFunctions: (() => Promise<Multicall3.ResultStructOutput[]>)[] = [];

    const contract = await this.contract();

    for (let batch = 0; batch < calls.length; batch += this.MULTICALL_BATCH_SIZE) {
      const callBatch = calls.slice(batch, batch + this.MULTICALL_BATCH_SIZE);

      const batchFunction = async () => {
        return await contract.callStatic.aggregate3(callBatch, overrides as any);
      };
      aggregateFunctions.push(batchFunction);
    }

    return aggregateFunctions;
  }

  async executeAggregateBatches(
    batchFunctions: (() => Promise<Multicall3.ResultStructOutput[]>)[],
    batchExecSize: number,
  ): Promise<Multicall3.ResultStructOutput[][]> {
    const results: Multicall3.ResultStructOutput[][] = [];

    for (let batch = 0; batch < batchFunctions.length; batch += batchExecSize) {
      const batchSlice = batchFunctions.slice(batch, batch + batchExecSize);
      const batchResults = await Promise.all(batchSlice.map((fn) => fn()));
      results.push(...batchResults);
    }

    return results;
  }
}
