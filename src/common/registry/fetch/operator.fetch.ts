/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@nestjs/common';
import { rangePromise } from '@lido-nestjs/utils';
import { Registry__factory } from '@lido-nestjs/contracts';
import { CallOverrides } from './interfaces/overrides.interface';
import { RegistryOperator } from './interfaces/operator.interface';
import { REGISTRY_OPERATORS_BATCH_SIZE } from './operator.constants';
import { ExecutionProvider } from 'common/execution-provider';

@Injectable()
export class RegistryOperatorFetchService {
  constructor(protected readonly provider: ExecutionProvider) {}

  private getContract(moduleAddress: string) {
    return Registry__factory.connect(moduleAddress, this.provider);
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

    const {
      name,
      active,
      rewardAddress,
      totalVettedValidators,
      totalExitedValidators,
      totalAddedValidators,
      totalDepositedValidators,
    } = operator;

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
