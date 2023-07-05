import { Test } from '@nestjs/testing';
import { Registry__factory } from '@lido-nestjs/contracts';
import { getNetwork } from '@ethersproject/networks';
import { Interface } from '@ethersproject/abi';
import { JsonRpcBatchProvider } from '@ethersproject/providers';
import { RegistryFetchModule, RegistryMetaFetchService } from '../../';

describe('Meta', () => {
  const provider = new JsonRpcBatchProvider(process.env.PROVIDERS_URLS);
  let fetchService: RegistryMetaFetchService;

  const mockCall = jest.spyOn(provider, 'call').mockImplementation(async () => '');

  const mockSend = jest.spyOn(provider, 'send').mockImplementation(async () => []);

  jest.spyOn(provider, 'detectNetwork').mockImplementation(async () => getNetwork('mainnet'));

  beforeEach(async () => {
    const imports = [RegistryFetchModule.forFeature({ provider })];
    const moduleRef = await Test.createTestingModule({ imports }).compile();
    fetchService = moduleRef.get(RegistryMetaFetchService);
  });

  afterEach(async () => {
    mockCall.mockReset();
    mockSend.mockReset();
  });

  describe('Keys op index', () => {
    test('fetchKeysOpIndex', async () => {
      const expected = 10;

      mockCall.mockImplementation(async () => {
        const iface = new Interface(Registry__factory.abi);
        return iface.encodeFunctionResult('getKeysOpIndex', [expected]);
      });
      const result = await fetchService.fetchKeysOpIndex();

      expect(result).toEqual(expected);
      expect(mockCall).toBeCalledTimes(1);
    });
  });
});
