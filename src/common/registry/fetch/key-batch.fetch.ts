import { Inject, Injectable } from '@nestjs/common';
import { REGISTRY_CONTRACT_TOKEN, Registry } from '@lido-nestjs/contracts';
import { CallOverrides } from './interfaces/overrides.interface';
import { KeyBatchRecord, RegistryKey } from './interfaces/key.interface';
import { RegistryOperatorFetchService } from './operator.fetch';
import { KEYS_BATCH_SIZE, KEYS_LENGTH, SIGNATURE_LENGTH } from './key-batch.constants';
import { RegistryFetchOptions, REGISTRY_FETCH_OPTIONS_TOKEN } from './interfaces/module.interface';
import { splitHex } from './utils/split-hex';
import { makeBatches } from './utils/batches';

@Injectable()
export class RegistryKeyBatchFetchService {
  constructor(
    protected readonly operatorsService: RegistryOperatorFetchService,
    @Inject(REGISTRY_CONTRACT_TOKEN) private contract: Registry,
    @Inject(REGISTRY_FETCH_OPTIONS_TOKEN) private options: RegistryFetchOptions,
  ) {}

  private getContract(moduleAddress: string) {
    return this.contract.attach(moduleAddress);
  }

  protected unformattedSignaturesToArray(unformattedSignatures: string) {
    return splitHex(unformattedSignatures, SIGNATURE_LENGTH);
  }

  protected unformattedKeysToArray(unformattedKeys: string) {
    return splitHex(unformattedKeys, KEYS_LENGTH);
  }

  public formatKeys(
    moduleAddress: string,
    operatorIndex: number,
    unformattedRecords: KeyBatchRecord,
    startIndex: number,
  ): RegistryKey[] {
    const keys = this.unformattedKeysToArray(unformattedRecords[0]);
    const signatures = this.unformattedSignaturesToArray(unformattedRecords[1]);
    const usedStatuses = unformattedRecords[2];

    if (keys.length !== signatures.length || keys.length !== usedStatuses.length) {
      throw new Error('format keys error');
    }

    return usedStatuses.map((used, chunkIndex) => {
      const index = startIndex + chunkIndex;
      return {
        operatorIndex,
        index,
        key: keys[chunkIndex],
        depositSignature: signatures[chunkIndex],
        used,
        moduleAddress,
      };
    });
  }

  /** fetches operator's keys from specific module */
  public async fetch(
    moduleAddress: string,
    operatorIndex: number,
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

    const [offset, limit] = this.convertIndicesToOffsetAndTotal(fromIndex, toIndex);
    const unformattedKeys = await this.fetchSigningKeysInBatches(
      moduleAddress,
      operatorIndex,
      offset,
      limit,
      overrides,
    );

    return unformattedKeys;
  }

  public async fetchSigningKeysInBatches(
    moduleAddress: string,
    operatorIndex: number,
    defaultOffset: number,
    totalAmount: number,
    overrides: CallOverrides,
  ) {
    const defaultBatchSize = this.options.keysBatchSize || KEYS_BATCH_SIZE;
    const batches = makeBatches(defaultBatchSize, defaultOffset, totalAmount);

    const promises = batches.map(async ({ offset, batchSize }) => {
      const keys = await this.getContract(moduleAddress).getSigningKeys(
        operatorIndex,
        offset,
        batchSize,
        overrides as any,
      );

      return this.formatKeys(moduleAddress, operatorIndex, keys, offset);
    });

    const results = await Promise.all(promises);
    return results.flat();
  }

  /**
   * Backward compatibility requires a method that converts fromIndex and toIndex to offset and limit
   * @param fromIndex
   * @param toIndex
   * @returns [offset, total]
   */
  protected convertIndicesToOffsetAndTotal(fromIndex: number, toIndex: number) {
    const offset = fromIndex;
    const total = toIndex - fromIndex;
    return [offset, total];
  }
}
