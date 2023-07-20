/* eslint-disable @typescript-eslint/ban-ts-comment */
import { TestingModule } from '@nestjs/testing';
import { RegistryMetaFetchService, RegistryOperatorFetchService, RegistryKeyBatchFetchService } from '../';
import { RegistryKey, RegistryMeta, RegistryOperator } from '../';
import { JsonRpcBatchProvider, Block } from '@ethersproject/providers';

const findKeys = (keys: RegistryKey[], operatorIndex: number, fromIndex = 0, totalAmount: number) => {
  return keys.filter((key) => key.operatorIndex === operatorIndex && key.index >= fromIndex).slice(0, totalAmount);
};

type Payload = {
  keys: RegistryKey[];
  operators: RegistryOperator[];
  meta: RegistryMeta;
};

export const registryServiceMock = (
  moduleRef: TestingModule,
  provider: JsonRpcBatchProvider,
  { keys, meta, operators }: Payload,
) => {
  const fetchBatchKey = moduleRef.get(RegistryKeyBatchFetchService);
  jest
    .spyOn(fetchBatchKey, 'fetchSigningKeysInBatches')
    .mockImplementation(async (operatorIndex, fromIndex, totalAmount) => {
      return findKeys(keys, operatorIndex, fromIndex, totalAmount);
    });

  jest.spyOn(provider, 'getBlock').mockImplementation(
    async () =>
      ({
        hash: meta.blockHash,
        number: meta.blockNumber,
        parentHash: meta.blockHash,
        timestamp: meta.timestamp,
      } as Block),
  );

  const metaFetch = moduleRef.get(RegistryMetaFetchService);

  jest.spyOn(metaFetch, 'fetchKeysOpIndex').mockImplementation(async () => meta.keysOpIndex);

  const operatorFetch = moduleRef.get(RegistryOperatorFetchService);

  jest.spyOn(operatorFetch, 'fetch').mockImplementation(async () => operators);
};
