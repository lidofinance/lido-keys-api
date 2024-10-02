import { Test } from '@nestjs/testing';
import { JsonRpcBatchProvider } from '@ethersproject/providers';
import { RegistryFetchModule, RegistryKeyBatchFetchService } from '../../';
import { REGISTRY_CONTRACT_ADDRESSES } from '@lido-nestjs/contracts';
import * as dotenv from 'dotenv';
import { LoggerModule, nullTransport } from '@lido-nestjs/logger';

dotenv.config();

describe('Fetch keys in batch', () => {
  const provider = new JsonRpcBatchProvider(process.env.PROVIDERS_URLS);
  if (!process.env.CHAIN_ID) {
    console.error("CHAIN_ID wasn't provides");
    process.exit(1);
  }
  const address = REGISTRY_CONTRACT_ADDRESSES[process.env.CHAIN_ID];

  let fetchService: RegistryKeyBatchFetchService;

  const operatorIndex = 17;
  const stakingLimit = 500;

  beforeEach(async () => {
    const imports = [
      RegistryFetchModule.forFeature({ provider }),
      LoggerModule.forRoot({ transports: [nullTransport()] }),
    ];
    const moduleRef = await Test.createTestingModule({ imports }).compile();
    fetchService = moduleRef.get(RegistryKeyBatchFetchService);
  });

  test('fetch one key', async () => {
    const overrides = { blockTag: 1488022 };
    const keys = await fetchService.fetch(address, operatorIndex, stakingLimit, 0, 3, overrides);

    expect(keys).toBeInstanceOf(Array);

    expect(keys.length).toBe(3);

    expect(keys[0].index).toBe(0);
    expect(keys[0].operatorIndex).toBe(operatorIndex);
    expect(keys[0].moduleAddress).toBe(address);
    expect(keys[0].used).toBe(true);
    expect(keys[0].vetted).toBe(true);

    expect(keys[1].index).toBe(1);
    expect(keys[1].operatorIndex).toBe(operatorIndex);
    expect(keys[1].moduleAddress).toBe(address);
    expect(keys[1].used).toBe(true);
    expect(keys[1].vetted).toBe(true);

    expect(keys[2].index).toBe(2);
    expect(keys[2].operatorIndex).toBe(operatorIndex);
    expect(keys[2].moduleAddress).toBe(address);
    expect(keys[2].used).toBe(true);
    expect(keys[2].vetted).toBe(true);
  });
});
