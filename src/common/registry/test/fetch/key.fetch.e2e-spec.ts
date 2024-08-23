import { Test } from '@nestjs/testing';
import { JsonRpcBatchProvider } from '@ethersproject/providers';
import { RegistryFetchModule, RegistryKeyFetchService } from '../../';
import { REGISTRY_CONTRACT_ADDRESSES } from '@lido-nestjs/contracts';
import * as dotenv from 'dotenv';
import { isAddress } from 'ethers/lib/utils';
import { LoggerModule, nullTransport } from '@lido-nestjs/logger';
import { ConfigModule } from 'common/config';
import { ExecutionProviderModule } from 'common/execution-provider';
import { SimpleFallbackJsonRpcBatchProvider } from '@lido-nestjs/execution';
import { PrometheusModule } from 'common/prometheus';

dotenv.config();

describe('Keys', () => {
  const provider = new JsonRpcBatchProvider(process.env.PROVIDERS_URLS);
  if (!process.env.CHAIN_ID) {
    console.error("CHAIN_ID wasn't provides");
    process.exit(1);
  }
  const address = REGISTRY_CONTRACT_ADDRESSES[process.env.CHAIN_ID];

  let fetchService: RegistryKeyFetchService;

  beforeEach(async () => {
    const imports = [
      ExecutionProviderModule,
      RegistryFetchModule.forFeature({ provider }),
      LoggerModule.forRoot({ transports: [nullTransport()] }),
      ConfigModule,
      PrometheusModule,
    ];
    const moduleRef = await Test.createTestingModule({ imports })
      .overrideProvider(SimpleFallbackJsonRpcBatchProvider)
      .useValue(provider)
      .compile();
    fetchService = moduleRef.get(RegistryKeyFetchService);
  });

  test('fetch one key', async () => {
    const key = await fetchService.fetchOne(address, 17, 0, { blockTag: 1488022 });

    expect(key).toBeInstanceOf(Object);

    expect(typeof key.operatorIndex).toBe('number');
    expect(typeof key.index).toBe('number');
    expect(typeof key.key).toBe('string');
    expect(typeof key.depositSignature).toBe('string');
    expect(isAddress(key.moduleAddress)).toBe(true);
  });

  test('fetch operator keys', async () => {
    const keys = await fetchService.fetch(address, 17, 0, 3, {
      blockTag: 1488022,
    });
    expect(keys).toBeInstanceOf(Array);
    expect(keys.length).toBe(3);
  }, 15_000);

  test('fetch several keys', async () => {
    const keys = await fetchService.fetch(address, 17, 0, 2, {
      blockTag: 1488022,
    });

    expect(keys).toBeInstanceOf(Array);
    expect(keys.length).toBe(2);

    expect(keys[0].operatorIndex).toBe(17);
    expect(keys[1].operatorIndex).toBe(17);

    expect(keys[0].index).toBe(0);
    expect(keys[1].index).toBe(1);
  });
});
