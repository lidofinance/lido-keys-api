import { Test } from '@nestjs/testing';
import { JsonRpcBatchProvider } from '@ethersproject/providers';
import { RegistryFetchModule, RegistryKeyFetchService } from '../../';
import { REGISTRY_CONTRACT_ADDRESSES } from '@lido-nestjs/contracts';
import * as dotenv from 'dotenv';
import { isAddress } from 'ethers/lib/utils';
import { LoggerModule, nullTransport } from '@lido-nestjs/logger';

dotenv.config();

describe('Keys', () => {
  const provider = new JsonRpcBatchProvider(process.env.PROVIDERS_URLS);
  if (!process.env.CHAIN_ID) {
    console.error("CHAIN_ID wasn't provides");
    process.exit(1);
  }
  const address = REGISTRY_CONTRACT_ADDRESSES[process.env.CHAIN_ID];

  let fetchService: RegistryKeyFetchService;

  const operatorIndex = 0;
  const fakeStakingLimit = 500;

  beforeEach(async () => {
    const imports = [
      RegistryFetchModule.forFeature({ provider }),
      LoggerModule.forRoot({ transports: [nullTransport()] }),
    ];
    const moduleRef = await Test.createTestingModule({ imports }).compile();
    fetchService = moduleRef.get(RegistryKeyFetchService);
  });

  test('fetch one key', async () => {
    const block = await provider.getBlock('latest');
    const overrides = { blockTag: block.hash };
    const key = await fetchService.fetchOne(address, operatorIndex, fakeStakingLimit, 0, overrides);

    expect(key).toBeInstanceOf(Object);

    expect(typeof key.operatorIndex).toBe('number');
    expect(typeof key.index).toBe('number');
    expect(typeof key.key).toBe('string');
    expect(typeof key.depositSignature).toBe('string');
    expect(isAddress(key.moduleAddress)).toBe(true);
  });

  test('fetch operator keys', async () => {
    const block = await provider.getBlock('latest');
    const overrides = { blockTag: block.hash };
    const keys = await fetchService.fetch(address, operatorIndex, fakeStakingLimit, 0, 3, overrides);
    expect(keys).toBeInstanceOf(Array);
    expect(keys.length).toBe(3);
  }, 15_000);

  test('fetch several keys', async () => {
    const block = await provider.getBlock('latest');
    const overrides = { blockTag: block.hash };
    const keys = await fetchService.fetch(address, operatorIndex, fakeStakingLimit, 0, 2, overrides);

    expect(keys).toBeInstanceOf(Array);
    expect(keys.length).toBe(2);

    expect(keys[0].operatorIndex).toBe(operatorIndex);
    expect(keys[1].operatorIndex).toBe(operatorIndex);

    expect(keys[0].index).toBe(0);
    expect(keys[1].index).toBe(1);

    expect(keys[0].used).toBe(true);
    expect(keys[1].used).toBe(true);

    expect(keys[0].vetted).toBe(true);
    expect(keys[1].vetted).toBe(true);
  });
});
