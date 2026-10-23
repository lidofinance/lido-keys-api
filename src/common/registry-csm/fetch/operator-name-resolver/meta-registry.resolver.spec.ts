import { utils } from 'ethers';
import { MetaRegistryNameResolver } from './meta-registry.resolver';

const MODULE = '0x' + 'a'.repeat(40);
const META_REGISTRY = '0x' + 'b'.repeat(40);

const buildResolver = (getLogs: jest.Mock, metaRegistry = jest.fn().mockResolvedValue(META_REGISTRY)) => {
  const connectCmv2 = jest.fn().mockReturnValue({ META_REGISTRY: metaRegistry }) as any;
  const connectMetaRegistry = jest.fn().mockImplementation((address: string) => ({
    provider: { getLogs },
    getOperatorMetadata: jest.fn().mockResolvedValue({ name: `name from ${address}` }),
  })) as any;
  return new MetaRegistryNameResolver(connectCmv2, connectMetaRegistry);
};

describe('MetaRegistryNameResolver.resolve', () => {
  it('reads the MetaRegistry address at the requested block on every call', async () => {
    const R1 = '0x' + '1'.repeat(40);
    const R2 = '0x' + '2'.repeat(40);
    const metaRegistry = jest.fn().mockResolvedValueOnce(R1).mockResolvedValueOnce(R2);
    const resolver = buildResolver(jest.fn(), metaRegistry);

    await expect(resolver.resolve(MODULE, 7, { blockTag: { blockHash: '0x01' } })).resolves.toBe(`name from ${R1}`);
    await expect(resolver.resolve(MODULE, 7, { blockTag: { blockHash: '0x02' } })).resolves.toBe(`name from ${R2}`);
    expect(metaRegistry).toHaveBeenNthCalledWith(1, { blockTag: { blockHash: '0x01' } });
    expect(metaRegistry).toHaveBeenNthCalledWith(2, { blockTag: { blockHash: '0x02' } });
  });
});

describe('MetaRegistryNameResolver.namesWereChanged', () => {
  it('reads the MetaRegistry address at the last block of the range', async () => {
    const metaRegistry = jest.fn().mockResolvedValue(META_REGISTRY);
    await buildResolver(jest.fn().mockResolvedValue([]), metaRegistry).namesWereChanged(MODULE, 10, 20);

    expect(metaRegistry).toHaveBeenCalledWith({ blockTag: 20 });
  });

  it('filters MetaRegistry logs by the operator metadata event', async () => {
    const getLogs = jest.fn().mockResolvedValue([]);
    await buildResolver(getLogs).namesWereChanged(MODULE, 10, 20);

    expect(getLogs).toHaveBeenCalledWith({
      address: META_REGISTRY,
      topics: [utils.id('OperatorMetadataSet(uint256,(string,string,bool))')],
      fromBlock: 10,
      toBlock: 20,
    });
  });

  it('returns true when an operator metadata event is found', async () => {
    const getLogs = jest.fn().mockResolvedValue([{}]);
    await expect(buildResolver(getLogs).namesWereChanged(MODULE, 10, 20)).resolves.toBe(true);
  });

  it('returns false when no events are found', async () => {
    const getLogs = jest.fn().mockResolvedValue([]);
    await expect(buildResolver(getLogs).namesWereChanged(MODULE, 10, 20)).resolves.toBe(false);
  });

  it('skips the request when the block range is empty', async () => {
    const getLogs = jest.fn();
    await expect(buildResolver(getLogs).namesWereChanged(MODULE, 21, 20)).resolves.toBe(false);
    expect(getLogs).not.toHaveBeenCalled();
  });
});
