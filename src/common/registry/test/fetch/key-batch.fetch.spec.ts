import { Global, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Registry__factory } from 'generated';
import { REGISTRY_CONTRACT_TOKEN } from 'common/contracts';
import { getNetwork } from '@ethersproject/networks';
import { Interface } from '@ethersproject/abi';
import { getDefaultProvider } from '@ethersproject/providers';
import { keysResponse, usedStatuses, mergedKeys, mergedSignatures } from '../fixtures/key-batch.fixture';
import { RegistryFetchModule, RegistryKeyBatchFetchService } from '../../';
import { LoggerModule, nullTransport } from '@lido-nestjs/logger';

describe('Keys', () => {
  const provider = getDefaultProvider(process.env.PROVIDERS_URLS);
  const address = '0x' + '55'.repeat(20);
  let fetchService: RegistryKeyBatchFetchService;

  const mockCall = jest.spyOn(provider, 'call').mockImplementation(async () => '');

  jest.spyOn(provider, 'detectNetwork').mockImplementation(async () => getNetwork('mainnet'));

  const operatorIndex = 0;
  const stakingLimit = 100;

  const connectRegistry = (addr: string) => Registry__factory.connect(addr, provider);

  @Global()
  @Module({
    providers: [{ provide: REGISTRY_CONTRACT_TOKEN, useValue: connectRegistry }],
    exports: [REGISTRY_CONTRACT_TOKEN],
  })
  class MockContractsModule {}

  beforeEach(async () => {
    const imports = [
      MockContractsModule,
      RegistryFetchModule.forFeature(),
      LoggerModule.forRoot({ transports: [nullTransport()] }),
    ];
    const moduleRef = await Test.createTestingModule({ imports }).compile();
    fetchService = moduleRef.get(RegistryKeyBatchFetchService);
  });

  afterEach(async () => {
    mockCall.mockReset();
  });

  test('fetch', async () => {
    mockCall.mockImplementation(async () => {
      const iface = new Interface(Registry__factory.abi);
      return iface.encodeFunctionResult('getSigningKeys', keysResponse);
    });
    const result = await fetchService.fetch(address, operatorIndex, stakingLimit, 0, usedStatuses.length);

    const [firstKey] = result;

    const isKeySatisfies = mergedKeys.startsWith(firstKey.key);
    const isSignaturesSatisfies = mergedSignatures.startsWith(firstKey.depositSignature);
    const isUseStatusSatisfies = firstKey.used === usedStatuses[0];

    expect(result).toHaveLength(usedStatuses.length);

    expect(isKeySatisfies).toBeTruthy();
    expect(isSignaturesSatisfies).toBeTruthy();
    expect(isUseStatusSatisfies).toBeTruthy();

    expect(mockCall).toBeCalledTimes(1);
  });

  test('fetch. fromIndex > toIndex', async () => {
    await expect(() => fetchService.fetch(address, operatorIndex, stakingLimit, 2, 1)).rejects.toThrow();
  });
});
