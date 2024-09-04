import { Test } from '@nestjs/testing';
import { getDefaultProvider } from '@ethersproject/providers';
import { RegistryFetchModule, RegistryMetaFetchService } from '../../';
import { REGISTRY_CONTRACT_ADDRESSES } from '@lido-nestjs/contracts';
import * as dotenv from 'dotenv';
import { LoggerModule, nullTransport } from '@lido-nestjs/logger';
import { ConfigModule } from 'common/config';
import { ExecutionProviderModule } from 'common/execution-provider';
import { SimpleFallbackJsonRpcBatchProvider } from '@lido-nestjs/execution';
import { PrometheusModule } from 'common/prometheus';

dotenv.config();

describe('Operators', () => {
  const provider = getDefaultProvider(process.env.PROVIDERS_URLS);

  if (!process.env.CHAIN_ID) {
    console.error("CHAIN_ID wasn't provides");
    process.exit(1);
  }
  const address = REGISTRY_CONTRACT_ADDRESSES[process.env.CHAIN_ID];

  let fetchService: RegistryMetaFetchService;

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
    fetchService = moduleRef.get(RegistryMetaFetchService);
  });

  test('fetch nonce', async () => {
    const nonce = await fetchService.fetchStakingModuleNonce(address);
    expect(typeof nonce).toBe('number');
    expect(nonce).toBeGreaterThan(0);
  });
});
