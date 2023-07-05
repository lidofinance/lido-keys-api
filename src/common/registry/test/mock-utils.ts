/* eslint-disable @typescript-eslint/ban-ts-comment */
import { TestingModule } from '@nestjs/testing';
import { RegistryKeyFetchService, RegistryMetaFetchService, RegistryOperatorFetchService } from '../';
import { RegistryKey, RegistryMeta, RegistryOperator } from '../';
import { JsonRpcBatchProvider, Block } from '@ethersproject/providers';

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
  const fetchKey = moduleRef.get(RegistryKeyFetchService);
  jest.spyOn(fetchKey, 'fetchOne').mockImplementation(async (operatorIndex, keyIndex) => {
    return keys.find((key) => key.index === keyIndex && key.operatorIndex === operatorIndex) as RegistryKey;
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
