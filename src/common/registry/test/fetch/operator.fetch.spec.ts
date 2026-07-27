import { Global, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Registry__factory } from 'generated';
import { REGISTRY_CONTRACT_TOKEN } from 'common/contracts';
import { getNetwork } from '@ethersproject/networks';
import { Interface } from '@ethersproject/abi';
import { JsonRpcBatchProvider } from '@ethersproject/providers';
import { operator, operatorFields, operatorSummary, operatorSummaryFields } from '../fixtures/operator.fixture';
import { RegistryFetchModule, RegistryOperatorFetchService } from '../../';
import { LoggerModule, nullTransport } from '@lido-nestjs/logger';

describe('Operators', () => {
  const provider = new JsonRpcBatchProvider(process.env.PROVIDERS_URLS);
  let fetchService: RegistryOperatorFetchService;
  const address = '0x' + '55'.repeat(20);

  const mockCall = jest.spyOn(provider, 'call').mockImplementation(async () => '');

  jest.spyOn(provider, 'detectNetwork').mockImplementation(async () => getNetwork('mainnet'));

  const connectRegistry = (addr: string) => Registry__factory.connect(addr, provider);

  const registryIface = new Interface(Registry__factory.abi);
  const getNodeOperatorSelector = registryIface.getSighash('getNodeOperator');
  const getNodeOperatorSummarySelector = registryIface.getSighash('getNodeOperatorSummary');
  const getNodeOperatorsCountSelector = registryIface.getSighash('getNodeOperatorsCount');

  const respondByMethod = (data: string, address: string) => {
    const selector = data.slice(0, 10);
    if (selector === getNodeOperatorSelector) {
      return registryIface.encodeFunctionResult(
        'getNodeOperator',
        operatorFields({ ...operator, moduleAddress: address }),
      );
    }
    if (selector === getNodeOperatorSummarySelector) {
      return registryIface.encodeFunctionResult('getNodeOperatorSummary', operatorSummaryFields(operatorSummary));
    }
    throw new Error(`unexpected selector ${selector}`);
  };

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
    fetchService = moduleRef.get(RegistryOperatorFetchService);
  });

  afterEach(async () => {
    mockCall.mockReset();
  });

  test('count', async () => {
    const expected = 2;
    mockCall.mockImplementation(async () => {
      return registryIface.encodeFunctionResult('getNodeOperatorsCount', [expected]);
    });
    const result = await fetchService.count(address);

    expect(result).toBe(expected);
    expect(mockCall).toBeCalledTimes(1);
  });

  test('fetchOne', async () => {
    const expected = { index: 1, moduleAddress: address, ...operator };

    mockCall.mockImplementation(async (tx) => respondByMethod((tx as any).data, address));
    const result = await fetchService.fetchOne(address, expected.index);

    expect(result).toEqual(expected);
    // getNodeOperator + getNodeOperatorSummary + getNodeOperator(finalized)
    expect(mockCall).toBeCalledTimes(3);
  });

  // `getNodeOperator` is read at the anchor block, the finalized deposited count at the floating
  // `finalized` tag. When the anchor is older than the finality delay, `finalized` can be ahead of it.
  const respondByBlockTag = (
    data: string,
    depositedAtAnchor: number,
    depositedAtFinalized: number,
    blockTag: unknown,
  ) => {
    const selector = data.slice(0, 10);
    if (selector === getNodeOperatorSummarySelector) {
      return registryIface.encodeFunctionResult('getNodeOperatorSummary', operatorSummaryFields(operatorSummary));
    }
    if (selector === getNodeOperatorSelector) {
      const deposited = blockTag === 'finalized' ? depositedAtFinalized : depositedAtAnchor;
      return registryIface.encodeFunctionResult(
        'getNodeOperator',
        operatorFields({ ...operator, totalSigningKeys: 40, usedSigningKeys: deposited }),
      );
    }
    throw new Error(`unexpected selector ${selector}`);
  };

  test('fetchOne does not let finalizedUsedSigningKeys exceed the anchor block deposited count', async () => {
    // anchor: 19 deposited; `finalized` already sees 20 (one deposit finalized after the anchor was fixed)
    mockCall.mockImplementation(async (tx, blockTag) => respondByBlockTag((tx as any).data, 19, 20, blockTag));

    const result = await fetchService.fetchOne(address, 1);

    expect(result.usedSigningKeys).toBe(19);
    expect(result.finalizedUsedSigningKeys).toBe(19);
    expect(result.finalizedUsedSigningKeys).toBeLessThanOrEqual(result.usedSigningKeys);
  });

  test('fetchOne keeps finalizedUsedSigningKeys when finalized is behind the anchor', async () => {
    // normal case: anchor sees 20, `finalized` still 19 → pointer stays 19, untouched
    mockCall.mockImplementation(async (tx, blockTag) => respondByBlockTag((tx as any).data, 20, 19, blockTag));

    const result = await fetchService.fetchOne(address, 1);

    expect(result.usedSigningKeys).toBe(20);
    expect(result.finalizedUsedSigningKeys).toBe(19);
  });

  test('fetch', async () => {
    const expectedFirst = { index: 1, moduleAddress: address, ...operator };
    const expectedSecond = { index: 2, moduleAddress: address, ...operator };

    mockCall.mockImplementation(async (tx) => respondByMethod((tx as any).data, address));
    const result = await fetchService.fetch(address, expectedFirst.index, expectedSecond.index + 1);

    expect(result).toEqual([expectedFirst, expectedSecond]);
    // 2 operators × (getNodeOperator + getNodeOperatorSummary + getNodeOperator(finalized))
    expect(mockCall).toBeCalledTimes(6);
  });

  test('fetch all', async () => {
    const expected = { index: 0, moduleAddress: address, ...operator };

    mockCall.mockImplementation(async (tx) => {
      const data = (tx as any).data as string;
      if (data.slice(0, 10) === getNodeOperatorsCountSelector) {
        return registryIface.encodeFunctionResult('getNodeOperatorsCount', [1]);
      }
      return respondByMethod(data, address);
    });
    const result = await fetchService.fetch(address);

    expect(result).toEqual([expected]);
    // getNodeOperatorsCount + getNodeOperator + getNodeOperatorSummary + getNodeOperator(finalized)
    expect(mockCall).toBeCalledTimes(4);
  });

  test('fetch. fromIndex > toIndex', async () => {
    await expect(() => fetchService.fetch(address, 2, 1)).rejects.toThrow();
  });
});
