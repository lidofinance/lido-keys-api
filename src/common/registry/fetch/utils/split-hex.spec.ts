import { splitHex } from './split-hex';

describe('splitHex util', () => {
  test('splits a hex string into chunks of specified length', () => {
    const hexString = '0x123456789abcdefABCDEF012'; // 24 characters
    const chunkLength = 4;
    const result = splitHex(hexString, chunkLength);
    expect(result).toEqual(['0x1234', '0x5678', '0x9abc', '0xdefA', '0xBCDE', '0xF012']);
  });

  test('throws RangeError if chunkLength is less than 1', () => {
    const hexString = '0xabcdef';
    const chunkLength = 0;
    expect(() => splitHex(hexString, chunkLength)).toThrowError('chunkLength should be positive integer');
  });

  test('throws Error if input is not a hex-like string', () => {
    const hexString = 'abcdef'; // Missing '0x' prefix
    const chunkLength = 2;
    expect(() => splitHex(hexString, chunkLength)).toThrowError('hexString is not a hex-like string');
  });

  test('throws Error if input is bad hex string', () => {
    const hexString = '0x01234567890AbCdEfG'; // G symbol
    const chunkLength = 2;
    expect(() => splitHex(hexString, chunkLength)).toThrowError('hexString is not a hex-like string');
  });

  test('throws Error if input is not a string', () => {
    const hexString: string = <any>1245;
    const chunkLength = 2;
    expect(() => splitHex(hexString, chunkLength)).toThrowError('hexString is not a hex-like string');
  });

  test('handles empty input string', () => {
    const hexString = '0x';
    const chunkLength = 2;
    const result = splitHex(hexString, chunkLength);
    expect(result).toEqual([]);
  });

  test('handles input string with odd length', () => {
    const hexString = '0x12345'; // 5 characters
    const chunkLength = 2;
    const result = splitHex(hexString, chunkLength);
    expect(result).toEqual(['0x12', '0x34']);
  });
});
