/* eslint-disable @typescript-eslint/ban-ts-comment */
import { TestingModule } from '@nestjs/testing';
import { RegistryKeyBatchFetchService, RegistryOperatorFetchService } from '..';
import { RegistryKey, RegistryOperator } from '..';
import { JsonRpcBatchProvider } from '@ethersproject/providers';

const findKeys = (keys: RegistryKey[], operatorIndex: number, fromIndex = 0, totalAmount: number) => {
  return keys.filter((key) => key.operatorIndex === operatorIndex && key.index >= fromIndex).slice(0, totalAmount);
};

type Payload = {
  keys: RegistryKey[];
  operators: RegistryOperator[];
};

export const registryServiceMock = (
  moduleRef: TestingModule,
  provider: JsonRpcBatchProvider,
  { keys, operators }: Payload,
) => {
  const fetchBatchKey = moduleRef.get(RegistryKeyBatchFetchService);
  jest
    .spyOn(fetchBatchKey, 'fetchSigningKeysInBatches')
    .mockImplementation(async (moduleAddress, operatorIndex, fromIndex, totalAmount) => {
      return findKeys(keys, operatorIndex, fromIndex, totalAmount);
    });

  const operatorFetch = moduleRef.get(RegistryOperatorFetchService);
  jest.spyOn(operatorFetch, 'fetch').mockImplementation(async () => operators);
};
