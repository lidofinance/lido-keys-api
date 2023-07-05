import { compareMeta } from '../../utils/meta.utils';

describe('Compare meta util', () => {
  const metaOne = {
    blockNumber: 1,
    blockHash: '0x01',
    keysOpIndex: 1,
    timestamp: 1,
  };

  const metaTwo = {
    blockNumber: 2,
    blockHash: '0x02',
    keysOpIndex: 2,
    timestamp: 2,
  };

  test('null - null', async () => {
    expect(compareMeta(null, null)).toBe(false);
  });

  test('null - meta', async () => {
    expect(compareMeta(null, metaOne)).toBe(false);
  });

  test('meta - null', async () => {
    expect(compareMeta(metaOne, null)).toBe(false);
  });

  test('meta - another meta', async () => {
    expect(compareMeta(metaOne, metaTwo)).toBe(false);
  });

  test('meta - same meta', async () => {
    expect(compareMeta(metaOne, metaOne)).toBe(true);
    expect(compareMeta(metaTwo, metaTwo)).toBe(true);
  });
});
