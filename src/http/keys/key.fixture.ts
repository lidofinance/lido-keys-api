import { hexZeroPad } from '@ethersproject/bytes';

export const key = {
  key: hexZeroPad('0x12', 98),
  depositSignature: hexZeroPad('0x12', 194),
  used: true,
};
