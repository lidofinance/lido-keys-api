/* eslint-disable @typescript-eslint/no-explicit-any */
import { Inject, Injectable } from '@nestjs/common';
import { rangePromise } from '@lido-nestjs/utils';
import { REGISTRY_CONTRACT_TOKEN, Registry } from '@lido-nestjs/contracts';
import { CallOverrides } from './interfaces/overrides.interface';
import { RegistryOperator } from './interfaces/operator.interface';
import { REGISTRY_OPERATORS_BATCH_SIZE } from './operator.constants';

@Injectable()
export class RegistryOperatorFetchService {
  constructor(@Inject(REGISTRY_CONTRACT_TOKEN) private contract: Registry) {}

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

  /** fetches number of operators */
  public async count(moduleAddress: string, overrides: CallOverrides = {}): Promise<number> {
    const bigNumber = await this.getContract(moduleAddress).getNodeOperatorsCount(overrides as any);
    return bigNumber.toNumber();
  }

  /** fetches one operator */
  public async fetchOne(
    moduleAddress: string,
    operatorIndex: number,
    overrides: CallOverrides = {},
  ): Promise<RegistryOperator> {
    const fullInfo = true;
    const operator = await this.getContract(moduleAddress).getNodeOperator(operatorIndex, fullInfo, overrides as any);
    const finalizedOperator = await this.getContract(moduleAddress).getNodeOperator(operatorIndex, fullInfo, {
      blockTag: 'finalized',
    });

    const {
      name,
      active,
      rewardAddress,
      totalVettedValidators,
      totalExitedValidators,
      totalAddedValidators,
      totalDepositedValidators,
    } = operator;

    const { totalDepositedValidators: finalizedUsedSigningKeys } = finalizedOperator;

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
      finalizedUsedSigningKeys: finalizedUsedSigningKeys.toNumber(),
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
