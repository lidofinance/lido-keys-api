import { utils } from 'ethers';
import { MetaRegistryNameResolver } from './meta-registry.resolver';
import { InvalidOperatorNameError } from './operator-name.resolver';

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

  // a real ethers-decoded result: the malformed UTF-8 error is deferred until the name field is read
  const decodeMetadata = (nameBytes: number[]) => {
    const iface = new utils.Interface([
      'function getOperatorMetadata(uint256) view returns ((string name, string description, bool ownerEditsRestricted))',
    ]);
    const raw = utils.defaultAbiCoder.encode(
      ['(bytes,bytes,bool)'],
      [[utils.hexlify(nameBytes), utils.toUtf8Bytes('description'), false]],
    );
    return iface.decodeFunctionResult('getOperatorMetadata', raw)[0];
  };

  const buildResolverWithMetadata = (getOperatorMetadata: jest.Mock) => {
    const connectCmv2 = jest.fn().mockReturnValue({ META_REGISTRY: jest.fn().mockResolvedValue(META_REGISTRY) }) as any;
    const connectMetaRegistry = jest.fn().mockReturnValue({ getOperatorMetadata }) as any;
    return new MetaRegistryNameResolver(connectCmv2, connectMetaRegistry);
  };

  it('throws InvalidOperatorNameError when the name is malformed UTF-8', async () => {
    const resolver = buildResolverWithMetadata(jest.fn().mockResolvedValue(decodeMetadata([0x41, 0xff, 0x42])));
    await expect(resolver.resolve(MODULE, 7)).rejects.toBeInstanceOf(InvalidOperatorNameError);
  });

  it('returns a decoded name', async () => {
    const resolver = buildResolverWithMetadata(jest.fn().mockResolvedValue(decodeMetadata([0x41, 0x42])));
    await expect(resolver.resolve(MODULE, 7)).resolves.toBe('AB');
  });

  it('propagates transport errors as is', async () => {
    const networkError = Object.assign(new Error('timeout'), { code: 'TIMEOUT' });
    const resolver = buildResolverWithMetadata(jest.fn().mockRejectedValue(networkError));
    await expect(resolver.resolve(MODULE, 7)).rejects.toBe(networkError);
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
