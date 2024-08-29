/* eslint-disable @typescript-eslint/no-explicit-any */
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { rangePromise } from '@lido-nestjs/utils';
import { REGISTRY_CONTRACT_TOKEN, Registry } from '@lido-nestjs/contracts';
import { CallOverrides } from './interfaces/overrides.interface';
import { RegistryOperator } from './interfaces/operator.interface';
import { REGISTRY_OPERATORS_BATCH_SIZE } from './operator.constants';
import { Csm, Csm__factory } from 'generated';
import { utils } from 'ethers';
import { MulticallService } from 'common/contracts/multicall.service';
import { ConfigService } from 'common/config';
import { Multicall3 } from 'generated/Multicall';

@Injectable()
export class RegistryOperatorFetchService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected logger: LoggerService,
    @Inject(REGISTRY_CONTRACT_TOKEN) private contract: Registry,

    private multicallService: MulticallService,
    private configService: ConfigService,
  ) {}

  private getContract(moduleAddress: string) {
    // TODO: pass provider instead this.contract.provider
    return Csm__factory.connect(moduleAddress, this.contract.provider);
  }

  /**
   * Exits early if relevant events are found, as they are used only as indicators for an update.
   */
  private async fetchOperatorsEvents(moduleAddress: string, fromBlock: number, toBlock: number) {
    if (fromBlock > toBlock) {
      return [];
    }

    const events = await this.getContract(moduleAddress).provider.getLogs({
      topics: [
        [
          // KECCAK256 hash of the text bytes
          utils.id('NodeOperatorAdded(uint256,address,address)'),
          utils.id('NodeOperatorRewardAddressChanged(uint256,address,address)'),
          utils.id('VettedSigningKeysCountChanged(uint256,uint256)'),
          utils.id('DepositedSigningKeysCountChanged(uint256,uint256)'),
        ],
      ],
      fromBlock,
      toBlock,
    });

    if (events.length > 0) return events;

    return events;
  }

  public async operatorsWereChanged(moduleAddress: string, fromBlock: number, toBlock: number): Promise<boolean> {
    const events = await this.fetchOperatorsEvents(moduleAddress, fromBlock, toBlock);

    return events.length > 0;
  }

  /** return blockTag for finalized block, it need for testing purposes */
  public getFinalizedBlockTag() {
    return 'finalized';
  }

  /** fetches number of operators */
  public async count(moduleAddress: string, overrides: CallOverrides = {}): Promise<number> {
    const bigNumber = await this.getContract(moduleAddress).getNodeOperatorsCount(overrides as any);
    return bigNumber.toNumber();
  }

  /**
   * fetches finalized operator
   * @param moduleAddress address of sr module
   * @param operatorIndex index of sr module operator
   * @returns used signing keys count, if error happened returns 0 (because of range error)
   */
  public async getFinalizedNodeOperatorUsedSigningKeys(moduleAddress: string, operatorIndex: number): Promise<number> {
    const contract = this.getContract(moduleAddress);
    try {
      const { totalDepositedKeys } = await contract.getNodeOperator(operatorIndex, {
        blockTag: this.getFinalizedBlockTag(),
      });

      return totalDepositedKeys;
    } catch (error) {
      this.logger.warn(
        `an error occurred while trying to load the finalized state for operator ${operatorIndex} from module ${moduleAddress}`,
        error,
      );
      return 0;
    }
  }

  /** fetches one operator */
  public async fetchOne(
    moduleAddress: string,
    operatorIndex: number,
    overrides: CallOverrides = {},
  ): Promise<RegistryOperator> {
    const contract = this.getContract(moduleAddress);

    const operator = await contract.getNodeOperator(operatorIndex, overrides as any);
    const { rewardAddress, totalAddedKeys, totalExitedKeys, totalDepositedKeys, totalVettedKeys } = operator;

    // There is no concept of "active/inactive" operator in CSM.
    // The method `getNodeOperatorIsActive` only checks if the operator's ID exists (ID < count).
    // We fetch operators with IDs < count, so here we can just set `active` to true.
    const active = true;

    const finalizedUsedSigningKeys = await this.getFinalizedNodeOperatorUsedSigningKeys(moduleAddress, operatorIndex);

    return {
      index: operatorIndex,
      active,
      name: `CSM Operator ${operatorIndex}`,
      rewardAddress,
      stakingLimit: totalVettedKeys,
      stoppedValidators: totalExitedKeys,
      totalSigningKeys: totalAddedKeys,
      usedSigningKeys: totalDepositedKeys,
      moduleAddress,
      finalizedUsedSigningKeys,
    };
  }

  /** fetches operators */
  public async fetch(
    moduleAddress: string,
    fromIndex = 0,
    toIndex = -1,
    overrides: CallOverrides = {},
  ): Promise<RegistryOperator[]> {
    if (fromIndex > toIndex && toIndex !== -1) {
      throw new Error('fromIndex is greater than or equal to toIndex');
    }

    if (toIndex == null || toIndex === -1) {
      toIndex = await this.count(moduleAddress, overrides);
    }

    const fetcher = async (operatorIndex: number) => {
      return await this.fetchOne(moduleAddress, operatorIndex, overrides);
    };

    const batchSize = REGISTRY_OPERATORS_BATCH_SIZE;

    return await rangePromise(fetcher, fromIndex, toIndex, batchSize);
  }

  public async fetchOperators(
    moduleAddress: string,
    fromIndex = 0,
    toIndex = -1,
    overrides: { blockTag: string | number },
  ): Promise<RegistryOperator[]> {
    const MULTICALL_ENABLE = this.configService.get('MULTICALL_ENABLE');

    if (MULTICALL_ENABLE) {
      return await this.multicallFetch(moduleAddress, fromIndex, toIndex, overrides);
    }

    return await this.fetch(moduleAddress, fromIndex, toIndex, overrides);
  }

  /**
   *
   * @param moduleAddress
   * @param fromIndex
   * @param toIndex
   * @param overrides
   * @returns
   */
  public async multicallFetch(
    moduleAddress: string,
    fromIndex = 0,
    toIndex = -1,
    overrides: { blockTag: string | number },
  ) {
    const contract = this.getContract(moduleAddress);

    if (fromIndex > toIndex && toIndex !== -1) {
      throw new Error('fromIndex is greater than or equal to toIndex');
    }

    if (toIndex == null || toIndex === -1) {
      toIndex = await this.count(moduleAddress, overrides);
    }

    // encode calls
    const calls = this.encode(contract, fromIndex, toIndex);

    // send via aggregate
    const multicallResults = await this.multicallService.aggregateInBatch(calls, overrides);

    // TODO: optimize
    const multicallResultsFinalized = await this.multicallService.aggregateInBatch(calls, {
      blockTag: this.getFinalizedBlockTag(),
    });

    // decode data
    const operators = this.decode(contract, multicallResults);
    const finalizedUsedSigningKeysValues = this.decodeFinalized(contract, multicallResultsFinalized);

    const results: RegistryOperator[] = finalizedUsedSigningKeysValues.map(({ finalizedUsedSigningKeys }, i) => ({
      ...operators[i],
      finalizedUsedSigningKeys,
    }));

    return results;
  }

  private encode(contract: Csm, fromIndex: number, toIndex: number): Multicall3.Call3Struct[] {
    const totalItems = toIndex - fromIndex;

    const calls: Multicall3.Call3Struct[] = Array.from({ length: totalItems }).map((_, i) => {
      const encodedFunction = this.encodeGetNodeOperatorCall(contract, i);

      return {
        target: contract.address,
        allowFailure: false,
        callData: encodedFunction,
      };
    });

    return calls;
  }

  private decode(
    contract: Csm,
    multicallResult: Multicall3.ResultStructOutput[],
  ): Omit<RegistryOperator, 'finalizedUsedSigningKeys'>[] {
    const decodedResults = multicallResult.map((result, index) => {
      const { success, returnData } = result;

      if (!success) {
        throw Error(`Call to getNodeOperator for index ${index} failed.`);
      }

      const decodedResult = this.decodeGetNodeOperatorCall(contract, returnData);

      return {
        index,
        active: true,
        name: `CSM Operator ${index}`,
        rewardAddress: decodedResult.rewardAddress,
        stakingLimit: decodedResult.totalVettedKeys,
        stoppedValidators: decodedResult.totalExitedKeys,
        totalSigningKeys: decodedResult.totalAddedKeys,
        usedSigningKeys: decodedResult.totalDepositedKeys,
        moduleAddress: contract.address,
      };
    });

    return decodedResults;
  }

  private decodeFinalized(
    contract: Csm,
    multicallResult: Multicall3.ResultStructOutput[],
  ): Pick<RegistryOperator, 'finalizedUsedSigningKeys'>[] {
    const decodedResults = multicallResult.map((result) => {
      const { success, returnData } = result;

      if (!success) {
        return { finalizedUsedSigningKeys: 0 };
      }

      const decodedResult = this.decodeGetNodeOperatorCall(contract, returnData);

      return {
        finalizedUsedSigningKeys: decodedResult.totalDepositedKeys,
      };
    });

    return decodedResults;
  }

  private encodeGetNodeOperatorCall(contract: Csm, operatorIndex: number) {
    return contract.interface.encodeFunctionData('getNodeOperator', [operatorIndex]);
  }

  private decodeGetNodeOperatorCall(contract: Csm, result: string) {
    const decodedResult = contract.interface.decodeFunctionResult('getNodeOperator' as any, result);

    // TODO: why decodeFunctionReturn return [[...data]]
    const { rewardAddress, totalAddedKeys, totalExitedKeys, totalDepositedKeys, totalVettedKeys } = decodedResult[0];

    return {
      rewardAddress,
      totalAddedKeys,
      totalExitedKeys,
      totalDepositedKeys,
      totalVettedKeys,
    };
  }
}
