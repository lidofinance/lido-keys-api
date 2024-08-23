import { Injectable } from '@nestjs/common';
import { ConfigService } from 'common/config';
import { ExecutionProvider } from 'common/execution-provider';
import { Multicall, Multicall__factory } from 'generated';
import { Multicall3 } from 'generated/Multicall';
import { MULTICALL_ADDRESS } from './constants';

@Injectable()
export class MulticallService {
  protected contract: Multicall;
  protected MULTICALL_BATCH_SIZE;

  constructor(protected readonly provider: ExecutionProvider, protected readonly configService: ConfigService) {
    const chainId = this.configService.get('CHAIN_ID');
    this.contract = Multicall__factory.connect(MULTICALL_ADDRESS[chainId], this.provider);
    this.MULTICALL_BATCH_SIZE = this.configService.get('MULTICALL_BATCH_SIZE');
  }

  public async aggregateInBatch(calls: Multicall3.Call3Struct[], overrides: { blockTag: string | number }) {
    const aggregateFunctions = this.createCallsBatchFunctions(calls, overrides);
    const results = await this.executeAggregateBatches(aggregateFunctions, 20);

    return results.flat();
  }

  /**
   *
   * @param calls
   * @param overrides
   */
  createCallsBatchFunctions(
    calls: Multicall3.Call3Struct[],
    overrides: { blockTag: string | number },
  ): (() => Promise<Multicall3.ResultStructOutput[]>)[] {
    const aggregateFunctions: (() => Promise<Multicall3.ResultStructOutput[]>)[] = [];

    for (let batch = 0; batch < calls.length; batch += this.MULTICALL_BATCH_SIZE) {
      const callBatch = calls.slice(batch, batch + this.MULTICALL_BATCH_SIZE);

      const batchFunction = async () => {
        return await this.contract.callStatic.aggregate3(callBatch, overrides);
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
