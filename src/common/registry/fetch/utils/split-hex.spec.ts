import { splitHex } from './split-hex';

describe('split-merged-record', () => {
  test('test1', () => {
    const parts = splitHex('0x123456789', 3);

    expect(parts).toEqual(['0x123', '0x456', '0x789']);
  });

  test('test2', () => {
    const parts = splitHex('0x1234567890', 3);

    expect(parts).toEqual(['0x123', '0x456', '0x789']);
  });

  test('test3', () => {
    const parts = splitHex('123456789', 3);

    expect(parts).toEqual(['0x123', '0x456', '0x789']);
  });
});
