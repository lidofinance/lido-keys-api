import { Inject, Injectable } from '@nestjs/common';
import { Registry, REGISTRY_CONTRACT_TOKEN } from '@lido-nestjs/contracts';
import { CallOverrides } from './interfaces/overrides.interface';
import { KeyBatchRecord, RegistryKey } from './interfaces/key.interface';
import { RegistryOperatorFetchService } from './operator.fetch';
import { KEYS_LENGTH, SIGNATURE_LENGTH } from './key-batch.constants';

@Injectable()
export class RegistryKeyBatchFetchService {
  constructor(
    @Inject(REGISTRY_CONTRACT_TOKEN)
    private contract: Registry,

    private operatorsService: RegistryOperatorFetchService,
  ) {}

  /**
   * Split one big string into array of strings
   * `0x${key1}{key2}...` -> `[`0x${key1}`, `0x${key2}`]`
   *
   * example record:
   * 0x81b4ae61a898396903897f94bea0e062c3a6925ee93d30f4d4aee93b533b49551ac337da78ff2ab0cfbb0adb380cad94953805708367b0b5f6710d41608ccdd0d5a67938e10e68dd010890d4bfefdcde874370423b0af0d0a053b7b98ae2d6ed
   *
   * 0x81b4ae61a898396903897f94bea0e062c3a6925ee93d30f4d4aee93b533b49551ac337da78ff2ab0cfbb0adb380cad94
   * @param record pubkey or signature merged string
   * @param capacity 96 or 192
   * @returns array of keys or signatures
   */
  protected splitMergedRecord(record: string, capacity: number) {
    const parts: string[] = [];
    let part = '';
    // start from index 2 because each record beginning from 0x
    for (let i = 2; i < record.length; i++) {
      part += record[i];
      if (part.length === capacity) {
        parts.push(`0x${part}`);
        part = '';
      }
    }
    return parts;
  }

  protected unformattedSignaturesToArray(unformattedSignatures: string) {
    return this.splitMergedRecord(unformattedSignatures, SIGNATURE_LENGTH);
  }

  protected unformattedKeysToArray(unformattedKeys: string) {
    return this.splitMergedRecord(unformattedKeys, KEYS_LENGTH);
  }

  public formatKeys(operatorIndex: number, unformattedRecords: KeyBatchRecord, startIndex: number): RegistryKey[] {
    const keys = this.unformattedKeysToArray(unformattedRecords[0]);
    const signatures = this.unformattedSignaturesToArray(unformattedRecords[1]);
    const usedStatuses = unformattedRecords[2];
    // TODO: do we need this?
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
      };
    });
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

    const [offset, limit] = this.convertIndicesToOffsetAndTotal(fromIndex, toIndex);
    const unformattedKeys = await this.fetchSigningKeysInBatches(operatorIndex, offset, limit);

    return unformattedKeys;
  }

  public async fetchSigningKeysInBatches(operatorIndex: number, fromIndex: number, totalAmount: number) {
    // TODO: move to constants/config cause this limit depends on eth node
    const batchSize = 1100;

    const numberOfBatches = Math.ceil(totalAmount / batchSize);
    const promises: Promise<RegistryKey[]>[] = [];

    for (let i = 0; i < numberOfBatches; i++) {
      const currentFromIndex = fromIndex + i * batchSize;
      const currentBatchSize = Math.min(batchSize, totalAmount - i * batchSize);

      const promise = (async () => {
        const keys = await this.contract.getSigningKeys(operatorIndex, currentFromIndex, currentBatchSize);
        return this.formatKeys(operatorIndex, keys, currentFromIndex);
      })();

      promises.push(promise);
    }

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
