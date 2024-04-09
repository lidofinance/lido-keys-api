import { Test } from '@nestjs/testing';
import { REGISTRY_CONTRACT_ADDRESSES, Registry__factory } from '@catalist-nestjs/contracts';
import { getNetwork } from '@ethersproject/networks';
import { Interface } from '@ethersproject/abi';
import { JsonRpcBatchProvider } from '@ethersproject/providers';
import { RegistryFetchModule, RegistryMetaFetchService } from '../../';
import { LoggerModule, nullTransport } from '@catalist-nestjs/logger';

describe('Meta', () => {
  const provider = new JsonRpcBatchProvider(process.env.PROVIDERS_URLS);
  let fetchService: RegistryMetaFetchService;
  const CHAIN_ID = process.env.CHAIN_ID || 1;
  const address = REGISTRY_CONTRACT_ADDRESSES[CHAIN_ID];

  const mockCall = jest.spyOn(provider, 'call').mockImplementation(async () => '');

  const mockSend = jest.spyOn(provider, 'send').mockImplementation(async () => []);

  jest.spyOn(provider, 'detectNetwork').mockImplementation(async () => getNetwork('mainnet'));

  beforeEach(async () => {
    const imports = [
      RegistryFetchModule.forFeature({ provider }),
      LoggerModule.forRoot({ transports: [nullTransport()] }),
    ];
    const moduleRef = await Test.createTestingModule({ imports }).compile();
    fetchService = moduleRef.get(RegistryMetaFetchService);
  });

  afterEach(async () => {
    mockCall.mockReset();
    mockSend.mockReset();
  });

  describe('Nonce', () => {
    test('getNonce', async () => {
      const expected = 10;

      mockCall.mockImplementation(async () => {
        const iface = new Interface(Registry__factory.abi);
        return iface.encodeFunctionResult('getNonce', [expected]);
      });
      const result = await fetchService.fetchStakingModuleNonce(address);

      expect(result).toEqual(expected);
      expect(mockCall).toBeCalledTimes(1);
    });
  });
});
