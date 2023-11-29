import { hexZeroPad } from '@ethersproject/bytes';

export const key = {
  key: hexZeroPad('0x12', 48),
  depositSignature: hexZeroPad('0x12', 96),
  used: true,
};

export const keyFields = [key.key, key.depositSignature, key.used];
