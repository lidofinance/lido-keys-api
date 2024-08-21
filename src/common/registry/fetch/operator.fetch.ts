/* eslint-disable @typescript-eslint/no-explicit-any */
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { rangePromise } from '@lido-nestjs/utils';
import { REGISTRY_CONTRACT_TOKEN, Registry } from '@lido-nestjs/contracts';
import { CallOverrides } from './interfaces/overrides.interface';
import { RegistryOperator } from './interfaces/operator.interface';
import { REGISTRY_OPERATORS_BATCH_SIZE } from './operator.constants';
import { utils } from 'ethers';
@Injectable()
export class RegistryOperatorFetchService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected logger: LoggerService,
    @Inject(REGISTRY_CONTRACT_TOKEN) private contract: Registry,
  ) {}

  private getContract(moduleAddress: string) {
    return this.contract.attach(moduleAddress);
  }

  /**
   * Exits early if relevant events are found, as they are used only as indicators for an update.
   */
  private async fetchOperatorsEvents(moduleAddress: string, fromBlock: number, toBlock: number) {
    if (fromBlock > toBlock) {
      return [];
    }

    const contract = await this.getContract(moduleAddress);

    // https://github.com/lidofinance/core/blob/master/contracts/0.4.24/nos/NodeOperatorsRegistry.sol#L39
    // https://docs.ethers.org/v5/api/providers/provider/#Provider-getLogs
    // from docs: Keep in mind that many backends will discard old events,
    // and that requests which are too broad may get dropped as they require too many resources to execute the query.
    let events = await this.getContract(moduleAddress).provider.getLogs({
      topics: [
        // KECCAK256 hash of the text bytes
        [
          utils.id('NodeOperatorAdded(uint256,string,address,uint64)'),
          utils.id('NodeOperatorNameSet(uint256,string)'),
          utils.id('NodeOperatorActiveSet(uint256,bool)'),
          utils.id('NodeOperatorRewardAddressSet(uint256, address)'),
        ],
      ],
      fromBlock,
      toBlock,
    });

    if (events.length > 0) return events;

    events = await this.getContract(moduleAddress).provider.getLogs({
      topics: [
        [
          // KECCAK256 hash of the text bytes
          utils.id('VettedSigningKeysCountChanged(uint256,uint256)'),
          utils.id('DepositedSigningKeysCountChanged(uint256,uint256)'),
          utils.id('ExitedSigningKeysCountChanged(uint256,uint256)'),
          utils.id('TotalSigningKeysCountChanged(uint256,uint256)'),
        ],
      ],
      fromBlock,
      toBlock,
    });

    if (events.length > 0) return events;

    events = await this.getContract(moduleAddress).provider.getLogs({
      topics: [
        // KECCAK256 hash of the text bytes
        utils.id('NodeOperatorTotalKeysTrimmed(uint256,uint64)'),
      ],
      fromBlock,
      toBlock,
    });

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
    const fullInfo = true;
    const contract = this.getContract(moduleAddress);
    try {
      const { totalDepositedValidators } = await contract.getNodeOperator(operatorIndex, fullInfo, {
        blockTag: this.getFinalizedBlockTag(),
      });

      return totalDepositedValidators.toNumber();
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
    const fullInfo = true;
    const contract = this.getContract(moduleAddress);

    const operator = await contract.getNodeOperator(operatorIndex, fullInfo, overrides as any);

    const {
      name,
      active,
      rewardAddress,
      totalVettedValidators,
      totalExitedValidators,
      totalAddedValidators,
      totalDepositedValidators,
    } = operator;

    const finalizedUsedSigningKeys = await this.getFinalizedNodeOperatorUsedSigningKeys(moduleAddress, operatorIndex);

    return {
      index: operatorIndex,
      active,
      name,
      rewardAddress,
      stakingLimit: totalVettedValidators.toNumber(),
      stoppedValidators: totalExitedValidators.toNumber(),
      totalSigningKeys: totalAddedValidators.toNumber(),
      usedSigningKeys: totalDepositedValidators.toNumber(),
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
}
