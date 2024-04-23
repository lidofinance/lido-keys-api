import { hexZeroPad } from '@ethersproject/bytes';

/**
 * keys 96 = 48byte
 * signatures 192 = 96byte
 * https://github.com/lidofinance/lido-dao/blob/539a0faf33807d04444047d0905dce2b45260dfa/contracts/0.4.24/lib/SigningKeys.sol#L213-L238
 */
export const KEYS_LENGTH_IN_BYTES = 48;
export const SIGNATURE_LENGTH_IN_BYTES = 96;

export const key = {
  key: hexZeroPad('0x12', KEYS_LENGTH_IN_BYTES),
  depositSignature: hexZeroPad('0x12', SIGNATURE_LENGTH_IN_BYTES),
  used: true,
};

export const keyFields = [key.key, key.depositSignature, key.used];
