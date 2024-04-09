/* eslint-disable @typescript-eslint/no-explicit-any */
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { LOGGER_PROVIDER } from '@catalist-nestjs/logger';
import { rangePromise } from '@catalist-nestjs/utils';
import { REGISTRY_CONTRACT_TOKEN, Registry } from '@catalist-nestjs/contracts';
import { CallOverrides } from './interfaces/overrides.interface';
import { RegistryOperator } from './interfaces/operator.interface';
import { REGISTRY_OPERATORS_BATCH_SIZE } from './operator.constants';

@Injectable()
export class RegistryOperatorFetchService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected logger: LoggerService,
    @Inject(REGISTRY_CONTRACT_TOKEN) private contract: Registry,
  ) {}

  private getContract(moduleAddress: string) {
    return this.contract.attach(moduleAddress);
  }

  public async operatorsWereChanged(
    moduleAddress: string,
    fromBlockNumber: number,
    toBlockNumber: number,
  ): Promise<boolean> {
    if (fromBlockNumber > toBlockNumber) {
      return false;
    }

    const nodeOperatorAddedFilter = this.getContract(moduleAddress).filters['NodeOperatorAdded']();
    const nodeOperatorAddedEvents = await this.getContract(moduleAddress).queryFilter(
      nodeOperatorAddedFilter,
      fromBlockNumber,
      toBlockNumber,
    );

    if (nodeOperatorAddedEvents.length) {
      return true;
    }

    const nodeOperatorNameSetFilter = this.getContract(moduleAddress).filters['NodeOperatorNameSet']();
    const nodeOperatorNameSetEvents = await this.getContract(moduleAddress).queryFilter(
      nodeOperatorNameSetFilter,
      fromBlockNumber,
      toBlockNumber,
    );

    if (nodeOperatorNameSetEvents.length) {
      return true;
    }
    const nodeOperatorRewardAddressSetFilter =
      this.getContract(moduleAddress).filters['NodeOperatorRewardAddressSet']();
    const nodeOperatorRewardAddressSetEvents = await this.getContract(moduleAddress).queryFilter(
      nodeOperatorRewardAddressSetFilter,
      fromBlockNumber,
      toBlockNumber,
    );

    if (nodeOperatorRewardAddressSetEvents.length) {
      return true;
    }

    return false;
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
