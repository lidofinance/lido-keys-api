/* eslint-disable @typescript-eslint/no-explicit-any */
import { Inject, Injectable } from '@nestjs/common';
import { rangePromise } from '@lido-nestjs/utils';
import { Registry, REGISTRY_CONTRACT_TOKEN } from '@lido-nestjs/contracts';
import { CallOverrides } from './interfaces/overrides.interface';
import { RegistryKey } from './interfaces/key.interface';
import { RegistryOperatorFetchService } from './operator.fetch';
import { REGISTRY_KEY_BATCH_SIZE } from './key.constants';

@Injectable()
export class RegistryKeyFetchService {
  constructor(
    @Inject(REGISTRY_CONTRACT_TOKEN)
    private contract: Registry,

    private operatorsService: RegistryOperatorFetchService,
  ) {}

  /** fetches one key */
  public async fetchOne(operatorIndex: number, keyIndex: number, overrides: CallOverrides = {}): Promise<RegistryKey> {
    const keyData = await this.contract.getSigningKey(operatorIndex, keyIndex, overrides as any);

    const { key, depositSignature, used } = keyData;

    return {
      operatorIndex,
      index: keyIndex,
      key,
      depositSignature,
      used,
    };
  }

  /** fetches operator's keys */
  public async fetch(
    operatorIndex: number,
    fromIndex = 0,
    toIndex = -1,
    overrides: CallOverrides = {},
  ): Promise<RegistryKey[]> {
    if (fromIndex > toIndex && toIndex !== -1) {
      throw new Error('fromIndex is greater than or equal to toIndex');
    }

    if (toIndex == null || toIndex === -1) {
      const operator = await this.operatorsService.fetchOne(operatorIndex, overrides);

      toIndex = operator.totalSigningKeys;
    }

    const fetcher = async (keyIndex: number) => {
      return await this.fetchOne(operatorIndex, keyIndex, overrides);
    };

    const batchSize = REGISTRY_KEY_BATCH_SIZE;

    return await rangePromise(fetcher, fromIndex, toIndex, batchSize);
  }
}
