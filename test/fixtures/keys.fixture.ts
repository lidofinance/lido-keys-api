import { hexZeroPad } from '@ethersproject/bytes';
import { RegistryKey } from 'common/registry';
import { Key } from 'http/common/entities';
import { KeyWithModuleAddress } from 'http/keys/entities';

// keys from db of  Registry (in future curated ) library
export const curatedKeys: RegistryKey[] = [
  {
    index: 1,
    operatorIndex: 1,
    key: hexZeroPad('0x12', 98),
    depositSignature: hexZeroPad('0x12', 194),
    used: true,
  },
  {
    index: 2,
    operatorIndex: 2,
    key: hexZeroPad('0x13', 98),
    depositSignature: hexZeroPad('0x13', 194),
    used: true,
  },
  {
    index: 3,
    operatorIndex: 2,
    key: hexZeroPad('0x13', 98),
    depositSignature: hexZeroPad('0x13', 194),
    used: false,
  },
  {
    index: 4,
    operatorIndex: 1,
    key: hexZeroPad('0x14', 98),
    depositSignature: hexZeroPad('0x12', 194),
    used: true,
  },
  {
    index: 5,
    operatorIndex: 1,
    key: hexZeroPad('0x15', 98),
    depositSignature: hexZeroPad('0x12', 194),
    used: true,
  },
  {
    index: 6,
    operatorIndex: 1,
    key: hexZeroPad('0x16', 98),
    depositSignature: hexZeroPad('0x12', 194),
    used: true,
  },
  {
    index: 7,
    operatorIndex: 1,
    key: hexZeroPad('0x17', 98),
    depositSignature: hexZeroPad('0x12', 194),
    used: true,
  },
  {
    index: 8,
    operatorIndex: 1,
    key: hexZeroPad('0x18', 98),
    depositSignature: hexZeroPad('0x12', 194),
    used: true,
  },
  {
    index: 9,
    operatorIndex: 1,
    key: hexZeroPad('0x19', 98),
    depositSignature: hexZeroPad('0x12', 194),
    used: true,
  },
  {
    index: 10,
    operatorIndex: 1,
    key: hexZeroPad('0x20', 98),
    depositSignature: hexZeroPad('0x12', 194),
    used: true,
  },
];

// keys for answers in general form without index according to document
// created from registry keys
export const keysInGeneralForm: Key[] = curatedKeys.map(({ operatorIndex, key, depositSignature, used }) => ({
  operatorIndex,
  key,
  depositSignature,
  used,
}));

export const curatedKeysWithAddressMainnet: KeyWithModuleAddress[] = curatedKeys.map(
  ({ operatorIndex, key, depositSignature, used }) => ({
    operatorIndex,
    key,
    depositSignature,
    used,
    moduleAddress: '0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5',
  }),
);

export const curatedKeysWithAddressGoerli: KeyWithModuleAddress[] = curatedKeys.map(
  ({ operatorIndex, key, depositSignature, used }) => ({
    operatorIndex,
    key,
    depositSignature,
    used,
    moduleAddress: '0x9D4AF1Ee19Dad8857db3a45B0374c81c8A1C6320',
  }),
);

export const operatorOneUsedKeys: RegistryKey[] = [
  {
    index: 1,
    operatorIndex: 1,
    key: hexZeroPad('0x12', 98),
    depositSignature: hexZeroPad('0x12', 194),
    used: true,
  },
  {
    index: 4,
    operatorIndex: 1,
    key: hexZeroPad('0x14', 98),
    depositSignature: hexZeroPad('0x12', 194),
    used: true,
  },
  {
    index: 5,
    operatorIndex: 1,
    key: hexZeroPad('0x15', 98),
    depositSignature: hexZeroPad('0x12', 194),
    used: true,
  },
  {
    index: 6,
    operatorIndex: 1,
    key: hexZeroPad('0x16', 98),
    depositSignature: hexZeroPad('0x12', 194),
    used: true,
  },
  {
    index: 7,
    operatorIndex: 1,
    key: hexZeroPad('0x17', 98),
    depositSignature: hexZeroPad('0x12', 194),
    used: true,
  },
  {
    index: 8,
    operatorIndex: 1,
    key: hexZeroPad('0x18', 98),
    depositSignature: hexZeroPad('0x12', 194),
    used: true,
  },
  {
    index: 9,
    operatorIndex: 1,
    key: hexZeroPad('0x19', 98),
    depositSignature: hexZeroPad('0x12', 194),
    used: true,
  },
  {
    index: 10,
    operatorIndex: 1,
    key: hexZeroPad('0x20', 98),
    depositSignature: hexZeroPad('0x12', 194),
    used: true,
  },
];
