import { Test } from '@nestjs/testing';
import { Registry__factory, REGISTRY_CONTRACT_ADDRESSES } from '@lido-nestjs/contracts';
import { getNetwork } from '@ethersproject/networks';
import { Interface } from '@ethersproject/abi';
import { getDefaultProvider } from '@ethersproject/providers';
import { keysResponse, usedStatuses, mergedKeys, mergedSignatures } from '../fixtures/key-batch.fixture';
import { RegistryFetchModule, RegistryKeyBatchFetchService } from '../../';
describe('Keys', () => {
  const provider = getDefaultProvider(process.env.PROVIDERS_URLS);
  const CHAIN_ID = process.env.CHAIN_ID || 1;
  const address = REGISTRY_CONTRACT_ADDRESSES[CHAIN_ID];
  let fetchService: RegistryKeyBatchFetchService;

  const mockCall = jest.spyOn(provider, 'call').mockImplementation(async () => '');

  jest.spyOn(provider, 'detectNetwork').mockImplementation(async () => getNetwork('mainnet'));

  beforeEach(async () => {
    const imports = [RegistryFetchModule.forFeature({ provider })];
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
    const result = await fetchService.fetch(address, 0, 0, usedStatuses.length);

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
    await expect(() => fetchService.fetch(address, 0, 2, 1)).rejects.toThrow();
  });
});
