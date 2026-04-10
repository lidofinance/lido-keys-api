import { Global, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Registry__factory } from 'generated';
import { REGISTRY_CONTRACT_TOKEN } from 'common/contracts';
import { getNetwork } from '@ethersproject/networks';
import { Interface } from '@ethersproject/abi';
import { JsonRpcBatchProvider } from '@ethersproject/providers';
import { RegistryFetchModule, RegistryMetaFetchService } from '../../';
import { LoggerModule, nullTransport } from '@lido-nestjs/logger';

describe('Meta', () => {
  const provider = new JsonRpcBatchProvider(process.env.PROVIDERS_URLS);
  let fetchService: RegistryMetaFetchService;
  const address = '0x' + '55'.repeat(20);

  const mockCall = jest.spyOn(provider, 'call').mockImplementation(async () => '');

  const mockSend = jest.spyOn(provider, 'send').mockImplementation(async () => []);

  jest.spyOn(provider, 'detectNetwork').mockImplementation(async () => getNetwork('mainnet'));

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
