import { Test } from '@nestjs/testing';
import { Registry__factory } from '@lido-nestjs/contracts';
import { getNetwork } from '@ethersproject/networks';
import { Interface } from '@ethersproject/abi';
import { getDefaultProvider } from '@ethersproject/providers';
import { operator, operatorFields } from '../fixtures/operator.fixture';
import { key, keyFields } from '../fixtures/key.fixture';
import { RegistryFetchModule, RegistryKeyFetchService } from '../../';

describe('Keys', () => {
  const provider = getDefaultProvider(process.env.EL_RPC_URL);
  let fetchService: RegistryKeyFetchService;

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
    const expected = { operatorIndex: 0, index: 1, ...key };

    mockCall.mockImplementation(async () => {
      const iface = new Interface(Registry__factory.abi);
      return iface.encodeFunctionResult('getSigningKey', keyFields);
    });
    const result = await fetchService.fetchOne(expected.operatorIndex, expected.index);

    expect(result).toEqual(expected);
    expect(mockCall).toBeCalledTimes(1);
  });

  test('fetch', async () => {
    const expectedFirst = { operatorIndex: 0, index: 1, ...key };
    const expectedSecond = { operatorIndex: 0, index: 2, ...key };

    mockCall.mockImplementation(async () => {
      const iface = new Interface(Registry__factory.abi);
      return iface.encodeFunctionResult('getSigningKey', keyFields);
    });
    const result = await fetchService.fetch(expectedFirst.operatorIndex, expectedFirst.index, expectedSecond.index + 1);

    expect(result).toEqual([expectedFirst, expectedSecond]);
    expect(mockCall).toBeCalledTimes(2);
  });

  test('fetch all operator keys', async () => {
    const expected = { operatorIndex: 1, index: 0, ...key };

    mockCall
      .mockImplementationOnce(async () => {
        const iface = new Interface(Registry__factory.abi);
        return iface.encodeFunctionResult('getNodeOperator', operatorFields({ ...operator, totalSigningKeys: 1 }));
      })
      .mockImplementation(async () => {
        const iface = new Interface(Registry__factory.abi);
        return iface.encodeFunctionResult('getSigningKey', keyFields);
      });
    const result = await fetchService.fetch(expected.operatorIndex);

    expect(result).toEqual([expected]);
    expect(mockCall).toBeCalledTimes(2);
  });

  test('fetch. fromIndex > toIndex', async () => {
    await expect(() => fetchService.fetch(0, 2, 1)).rejects.toThrow();
  });
});
