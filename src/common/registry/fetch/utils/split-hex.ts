/**
 * Split one big string into array of strings
 * `0x${key1}{key2}...` -> `[`0x${key1}`, `0x${key2}`]`
 *
 * example record:
 * 0x81b4ae61a898396903897f94bea0e062c3a6925ee93d30f4d4aee93b533b49551ac337da78ff2ab0cfbb0adb380cad94953805708367b0b5f6710d41608ccdd0d5a67938e10e68dd010890d4bfefdcde874370423b0af0d0a053b7b98ae2d6ed
 *
 * 0x81b4ae61a898396903897f94bea0e062c3a6925ee93d30f4d4aee93b533b49551ac337da78ff2ab0cfbb0adb380cad94
 * @param record pubkey or signature merged string
 * @param capacity 96 or 192
 * @returns array of keys or signatures
 */
export const splitHex = (hexString: string, chunkLength: number) => {
  if (chunkLength < 1) {
    throw new RangeError('chunkLength should be positive');
  }

  if (typeof hexString !== 'string' || hexString.substring(0, 2) !== '0x') {
    throw new Error('not a hex-like string');
  }

  const parts: string[] = [];
  let part = '';
  // start from index 2 because each record beginning from 0x
  for (let i = 2; i < hexString.length; i++) {
    part += hexString[i];
    if (part.length === chunkLength) {
      parts.push(`0x${part}`);
      part = '';
    }
  }
  return parts;
};
