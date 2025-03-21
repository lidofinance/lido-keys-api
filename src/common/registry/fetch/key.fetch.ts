/* eslint-disable @typescript-eslint/no-explicit-any */
import { Inject, Injectable } from '@nestjs/common';
import { rangePromise } from '@lido-nestjs/utils';
import { CallOverrides } from './interfaces/overrides.interface';
import { RegistryKey } from './interfaces/key.interface';
import { RegistryOperatorFetchService } from './operator.fetch';
import { REGISTRY_KEY_BATCH_SIZE } from './key.constants';
import { REGISTRY_CONTRACT_TOKEN, Registry } from '@lido-nestjs/contracts';
import { PrometheusService } from 'common/prometheus';

@Injectable()
export class RegistryKeyFetchService {
  constructor(
    @Inject(REGISTRY_CONTRACT_TOKEN) private contract: Registry,
    private operatorsService: RegistryOperatorFetchService,
    protected readonly prometheusService: PrometheusService,
  ) {}

  private getContract(moduleAddress: string) {
    return this.contract.attach(moduleAddress);
  }

  /** fetches one key */
  public async fetchOne(
    moduleAddress: string,
    operatorIndex: number,
    stakingLimit: number,
    keyIndex: number,
    overrides: CallOverrides = {},
  ): Promise<RegistryKey> {
    const keyData = await this.getContract(moduleAddress).getSigningKey(operatorIndex, keyIndex, overrides as any);
    this.prometheusService.totalRpcRequests.inc();

    const { key, depositSignature, used } = keyData;

    return {
      operatorIndex,
      index: keyIndex,
      vetted: keyIndex < stakingLimit,
      key,
      depositSignature,
      used,
      moduleAddress,
    };
  }

  /** fetches operator's keys */
  public async fetch(
    moduleAddress: string,
    operatorIndex: number,
    stakingLimit: number,
    fromIndex = 0,
    toIndex = -1,
    overrides: CallOverrides = {},
  ): Promise<RegistryKey[]> {
    if (fromIndex > toIndex && toIndex !== -1) {
      throw new Error('fromIndex is greater than or equal to toIndex');
    }

    if (toIndex == null || toIndex === -1) {
      const operator = await this.operatorsService.fetchOne(moduleAddress, operatorIndex, overrides);
      toIndex = operator.totalSigningKeys;
    }

    const fetcher = async (keyIndex: number) => {
      return await this.fetchOne(moduleAddress, operatorIndex, stakingLimit, keyIndex, overrides);
    };

    const batchSize = REGISTRY_KEY_BATCH_SIZE;

    return await rangePromise(fetcher, fromIndex, toIndex, batchSize);
  }
}
