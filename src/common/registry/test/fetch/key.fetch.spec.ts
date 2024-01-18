import { Test } from '@nestjs/testing';
import { REGISTRY_CONTRACT_ADDRESSES, Registry__factory } from '@lido-nestjs/contracts';
import { getNetwork } from '@ethersproject/networks';
import { Interface } from '@ethersproject/abi';
import { getDefaultProvider } from '@ethersproject/providers';
import { operator, operatorFields } from '../fixtures/operator.fixture';
import { key, keyFields } from '../fixtures/key.fixture';
import { RegistryFetchModule, RegistryKeyFetchService } from '../../';

describe('Keys', () => {
  const provider = getDefaultProvider(process.env.PROVIDERS_URLS);
  let fetchService: RegistryKeyFetchService;
  const CHAIN_ID = process.env.CHAIN_ID || 1;
  const address = REGISTRY_CONTRACT_ADDRESSES[CHAIN_ID];
  const mockCall = jest.spyOn(provider, 'call').mockImplementation(async () => '');

  jest.spyOn(provider, 'detectNetwork').mockImplementation(async () => getNetwork('mainnet'));

  beforeEach(async () => {
    const imports = [RegistryFetchModule.forFeature({ provider })];
    const moduleRef = await Test.createTestingModule({ imports }).compile();
    fetchService = moduleRef.get(RegistryKeyFetchService);
  });

  afterEach(async () => {
    mockCall.mockReset();
  });

  test('fetchOne', async () => {
    const expected = { operatorIndex: 0, index: 1, moduleAddress: address, ...key };

    mockCall.mockImplementation(async () => {
      const iface = new Interface(Registry__factory.abi);
      return iface.encodeFunctionResult('getSigningKey', keyFields);
    });
    const result = await fetchService.fetchOne(address, expected.operatorIndex, expected.index);

    expect(result).toEqual(expected);
    expect(mockCall).toBeCalledTimes(1);
  });

  test('fetch', async () => {
    const expectedFirst = { operatorIndex: 0, index: 1, moduleAddress: address, ...key };
    const expectedSecond = { operatorIndex: 0, index: 2, moduleAddress: address, ...key };

    mockCall.mockImplementation(async () => {
      const iface = new Interface(Registry__factory.abi);
      return iface.encodeFunctionResult('getSigningKey', keyFields);
    });
    const result = await fetchService.fetch(
      address,
      expectedFirst.operatorIndex,
      expectedFirst.index,
      expectedSecond.index + 1,
    );

    expect(result).toEqual([expectedFirst, expectedSecond]);
    expect(mockCall).toBeCalledTimes(2);
  });

  test('fetch all operator keys', async () => {
    const expected = { operatorIndex: 1, index: 0, moduleAddress: address, ...key };

    mockCall
      .mockImplementationOnce(async () => {
        const iface = new Interface(Registry__factory.abi);
        return iface.encodeFunctionResult(
          'getNodeOperator',
          operatorFields({ ...operator, moduleAddress: address, totalSigningKeys: 1 }),
        );
      })
      .mockImplementation(async () => {
        const iface = new Interface(Registry__factory.abi);
        return iface.encodeFunctionResult('getSigningKey', keyFields);
      });
    const result = await fetchService.fetch(address, expected.operatorIndex);

    expect(result).toEqual([expected]);
    expect(mockCall).toBeCalledTimes(3);
  });

  test('fetch all operator keys with reorg', async () => {
    const expected = { operatorIndex: 1, index: 0, moduleAddress: address, ...key };

    mockCall
      .mockImplementationOnce(async () => {
        const iface = new Interface(Registry__factory.abi);
        return iface.encodeFunctionResult(
          'getNodeOperator',
          operatorFields({
            ...operator,
            moduleAddress: address,
            totalSigningKeys: 1,
            usedSigningKeys: 2,
            finalizedUsedSigningKeys: 1,
          }),
        );
      })
      .mockImplementation(async () => {
        const iface = new Interface(Registry__factory.abi);
        return iface.encodeFunctionResult('getSigningKey', keyFields);
      });
    const result = await fetchService.fetch(address, expected.operatorIndex);
    expect(result).toEqual([expected]);
    expect(mockCall).toBeCalledTimes(3);
  });

  test('fetch. fromIndex > toIndex', async () => {
    await expect(() => fetchService.fetch(address, 0, 2, 1)).rejects.toThrow();
  });
});
