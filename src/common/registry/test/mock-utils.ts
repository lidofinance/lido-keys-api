/* eslint-disable @typescript-eslint/ban-ts-comment */
import { TestingModule } from '@nestjs/testing';
import { RegistryKeyBatchFetchService, RegistryOperatorFetchService } from '..';
import { RegistryKey, RegistryOperator } from '..';

const findKeys = (keys: RegistryKey[], operatorIndex: number, fromIndex = 0, totalAmount: number) => {
  return keys.filter((key) => key.operatorIndex === operatorIndex && key.index >= fromIndex).slice(0, totalAmount);
};

type Payload = {
  keys: RegistryKey[];
  operators: RegistryOperator[];
};

export const registryServiceMock = (moduleRef: TestingModule, { keys, operators }: Payload) => {
  const fetchBatchKey = moduleRef.get(RegistryKeyBatchFetchService);
  const fetchSigningKeysInBatchesMock = jest
    .spyOn(fetchBatchKey, 'fetchSigningKeysInBatches')
    .mockImplementation(async (moduleAddress, operatorIndex, stakingLimit, fromIndex, totalAmount) => {
      return findKeys(keys, operatorIndex, fromIndex, totalAmount);
    });

  const operatorFetch = moduleRef.get(RegistryOperatorFetchService);
  const operatorsMock = jest.spyOn(operatorFetch, 'fetch').mockImplementation(async () => operators);

  return () => {
    fetchSigningKeysInBatchesMock.mockReset();
    operatorsMock.mockReset();
  };
};
