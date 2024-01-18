import { Test } from '@nestjs/testing';
import { REGISTRY_CONTRACT_ADDRESSES, Registry__factory } from '@lido-nestjs/contracts';
import { getNetwork } from '@ethersproject/networks';
import { Interface } from '@ethersproject/abi';
import { JsonRpcBatchProvider } from '@ethersproject/providers';
import { operator, operatorFields } from '../fixtures/operator.fixture';
import { RegistryFetchModule, RegistryOperatorFetchService } from '../../';

describe('Operators', () => {
  const provider = new JsonRpcBatchProvider(process.env.PROVIDERS_URLS);
  let fetchService: RegistryOperatorFetchService;
  const CHAIN_ID = process.env.CHAIN_ID || 1;
  const address = REGISTRY_CONTRACT_ADDRESSES[CHAIN_ID];

  const mockCall = jest.spyOn(provider, 'call').mockImplementation(async () => '');

  jest.spyOn(provider, 'detectNetwork').mockImplementation(async () => getNetwork('mainnet'));

  beforeEach(async () => {
    const imports = [RegistryFetchModule.forFeature({ provider })];
    const moduleRef = await Test.createTestingModule({ imports }).compile();
    fetchService = moduleRef.get(RegistryOperatorFetchService);
  });

  afterEach(async () => {
    mockCall.mockReset();
  });

  test('count', async () => {
    const expected = 2;
    mockCall.mockImplementation(async () => {
      const iface = new Interface(Registry__factory.abi);
      return iface.encodeFunctionResult('getNodeOperatorsCount', [expected]);
    });
    const result = await fetchService.count(address);

    expect(result).toBe(expected);
    expect(mockCall).toBeCalledTimes(1);
  });

  test('fetchOne', async () => {
    const expected = { index: 1, moduleAddress: address, ...operator };

    mockCall.mockImplementation(async () => {
      const iface = new Interface(Registry__factory.abi);
      return iface.encodeFunctionResult('getNodeOperator', operatorFields({ ...operator, moduleAddress: address }));
    });
    const result = await fetchService.fetchOne(address, expected.index);

    expect(result).toEqual(expected);
    expect(mockCall).toBeCalledTimes(2);
  });

  test('fetch', async () => {
    const expectedFirst = { index: 1, moduleAddress: address, ...operator };
    const expectedSecond = { index: 2, moduleAddress: address, ...operator };

    mockCall.mockImplementation(async () => {
      const iface = new Interface(Registry__factory.abi);
      return iface.encodeFunctionResult('getNodeOperator', operatorFields({ ...operator, moduleAddress: address }));
    });
    const result = await fetchService.fetch(address, expectedFirst.index, expectedSecond.index + 1);

    expect(result).toEqual([expectedFirst, expectedSecond]);
    expect(mockCall).toBeCalledTimes(4);
  });

  test('fetch all', async () => {
    const expected = { index: 0, moduleAddress: address, ...operator };

    mockCall
      .mockImplementationOnce(async () => {
        const iface = new Interface(Registry__factory.abi);
        return iface.encodeFunctionResult('getNodeOperatorsCount', [1]);
      })
      .mockImplementation(async () => {
        const iface = new Interface(Registry__factory.abi);
        operator['moduleAddress'] = address;
        return iface.encodeFunctionResult('getNodeOperator', operatorFields(operator));
      });
    const result = await fetchService.fetch(address);

    expect(result).toEqual([expected]);
    expect(mockCall).toBeCalledTimes(3);
  });

  test('fetch. fromIndex > toIndex', async () => {
    await expect(() => fetchService.fetch(address, 2, 1)).rejects.toThrow();
  });
});
