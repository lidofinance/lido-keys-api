import { utils } from 'ethers';
import { RegistryOperatorFetchService } from './operator.fetch';

const MODULE = '0x' + 'a'.repeat(40);
const CSM_TYPE = 'community-onchain-v1';
const CMV2_TYPE = 'curated-onchain-v2';

const buildService = (getLogs: jest.Mock, type = CSM_TYPE, namesWereChanged?: jest.Mock) => {
  const logger = { error: jest.fn(), warn: jest.fn(), log: jest.fn() } as any;
  const connectCsm = jest.fn().mockReturnValue({ provider: { getLogs } }) as any;
  const resolvers = {
    [CSM_TYPE]: { resolve: jest.fn() },
    [CMV2_TYPE]: { resolve: jest.fn(), namesWereChanged },
  } as any;
  const moduleTypeRegistry = { get: jest.fn().mockReturnValue(type) } as any;
  return new RegistryOperatorFetchService(logger, connectCsm, resolvers, moduleTypeRegistry);
};

describe('RegistryOperatorFetchService.operatorsWereChanged', () => {
  it('filters logs by reward address and vetted keys count events', async () => {
    const getLogs = jest.fn().mockResolvedValue([]);
    await buildService(getLogs).operatorsWereChanged(MODULE, 10, 20);

    expect(getLogs).toHaveBeenCalledWith({
      address: MODULE,
      topics: [
        [
          utils.id('NodeOperatorRewardAddressChanged(uint256,address,address)'),
          utils.id('VettedSigningKeysCountChanged(uint256,uint256)'),
        ],
      ],
      fromBlock: 10,
      toBlock: 20,
    });
  });

  it('returns true when a vetted keys count event is found', async () => {
    const getLogs = jest
      .fn()
      .mockResolvedValue([{ topics: [utils.id('VettedSigningKeysCountChanged(uint256,uint256)')] }]);
    await expect(buildService(getLogs).operatorsWereChanged(MODULE, 10, 20)).resolves.toBe(true);
  });

  it('returns false when no events are found', async () => {
    const getLogs = jest.fn().mockResolvedValue([]);
    await expect(buildService(getLogs).operatorsWereChanged(MODULE, 10, 20)).resolves.toBe(false);
  });

  it('skips the request when the block range is empty', async () => {
    const getLogs = jest.fn();
    await expect(buildService(getLogs).operatorsWereChanged(MODULE, 21, 20)).resolves.toBe(false);
    expect(getLogs).not.toHaveBeenCalled();
  });

  it('returns true when only operator names were changed', async () => {
    const getLogs = jest.fn().mockResolvedValue([]);
    const namesWereChanged = jest.fn().mockResolvedValue(true);
    const service = buildService(getLogs, CMV2_TYPE, namesWereChanged);

    await expect(service.operatorsWereChanged(MODULE, 10, 20)).resolves.toBe(true);
    expect(namesWereChanged).toHaveBeenCalledWith(MODULE, 10, 20);
  });

  it('does not check names when module events are found', async () => {
    const getLogs = jest.fn().mockResolvedValue([{}]);
    const namesWereChanged = jest.fn();
    const service = buildService(getLogs, CMV2_TYPE, namesWereChanged);

    await expect(service.operatorsWereChanged(MODULE, 10, 20)).resolves.toBe(true);
    expect(namesWereChanged).not.toHaveBeenCalled();
  });
});
