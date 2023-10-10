import { Test } from '@nestjs/testing';
import { JsonRpcBatchProvider } from '@ethersproject/providers';
import { RegistryFetchModule, RegistryKeyBatchFetchService } from '../../';
import { REGISTRY_CONTRACT_ADDRESSES } from '@lido-nestjs/contracts';
import * as dotenv from 'dotenv';

dotenv.config();

describe('Fetch keys in batch', () => {
  const provider = new JsonRpcBatchProvider(process.env.PROVIDERS_URLS);
  if (!process.env.CHAIN_ID) {
    console.error("CHAIN_ID wasn't provides");
    process.exit(1);
  }
  const address = REGISTRY_CONTRACT_ADDRESSES[process.env.CHAIN_ID];

  let fetchService: RegistryKeyBatchFetchService;

  beforeEach(async () => {
    const imports = [RegistryFetchModule.forFeature({ provider })];
    const moduleRef = await Test.createTestingModule({ imports }).compile();
    fetchService = moduleRef.get(RegistryKeyBatchFetchService);
  });

  test('fetch one key', async () => {
    const keys = await fetchService.fetch(address, 17, 0, 3, { blockTag: 9641262 });

    expect(keys).toBeInstanceOf(Array);

    expect(keys.length).toBe(3);

    expect(keys[0].index).toBe(0);
    expect(keys[0].operatorIndex).toBe(17);
    expect(keys[0].moduleAddress).toBe(address);

    expect(keys[1].index).toBe(1);
    expect(keys[1].operatorIndex).toBe(17);
    expect(keys[1].moduleAddress).toBe(address);

    expect(keys[2].index).toBe(2);
    expect(keys[2].operatorIndex).toBe(17);
    expect(keys[2].moduleAddress).toBe(address);
  });
});
