import { hexZeroPad } from '@ethersproject/bytes';
import { ValidatorStatus } from '@lido-nestjs/validators-registry';

export const dbValidators = [
  {
    index: 1,
    pubkey: hexZeroPad('0x12', 98),
    status: ValidatorStatus.ACTIVE_ONGOING,
  },
  {
    index: 2,
    pubkey: hexZeroPad('0x13', 98),
    status: ValidatorStatus.PENDING_INITIALIZED,
  },
  {
    index: 3,
    pubkey: hexZeroPad('0x14', 98),
    status: ValidatorStatus.PENDING_INITIALIZED,
  },
  {
    index: 4,
    pubkey: hexZeroPad('0x14', 98),
    status: ValidatorStatus.ACTIVE_ONGOING,
  },
  {
    index: 5,
    pubkey: hexZeroPad('0x15', 98),
    status: ValidatorStatus.ACTIVE_ONGOING,
  },
  {
    index: 6,
    pubkey: hexZeroPad('0x16', 98),
    status: ValidatorStatus.ACTIVE_ONGOING,
  },
  {
    index: 7,
    pubkey: hexZeroPad('0x17', 98),
    status: ValidatorStatus.ACTIVE_ONGOING,
  },
  {
    index: 8,
    pubkey: hexZeroPad('0x18', 98),
    status: ValidatorStatus.ACTIVE_ONGOING,
  },
  {
    index: 9,
    key: hexZeroPad('0x19', 98),
    status: ValidatorStatus.WITHDRAWAL_DONE,
  },
  {
    index: 10,
    key: hexZeroPad('0x20', 98),
    status: ValidatorStatus.EXITED_SLASHED,
  },
];

export const operatorOneValidatorsToExit = [
  {
    index: 1,
    pubkey: hexZeroPad('0x12', 98),
    status: ValidatorStatus.ACTIVE_ONGOING,
  },
  {
    index: 4,
    pubkey: hexZeroPad('0x14', 98),
    status: ValidatorStatus.ACTIVE_ONGOING,
  },
  {
    index: 5,
    pubkey: hexZeroPad('0x15', 98),
    status: ValidatorStatus.ACTIVE_ONGOING,
  },
  {
    index: 6,
    pubkey: hexZeroPad('0x16', 98),
    status: ValidatorStatus.ACTIVE_ONGOING,
  },
  {
    index: 7,
    pubkey: hexZeroPad('0x17', 98),
    status: ValidatorStatus.ACTIVE_ONGOING,
  },
  {
    index: 8,
    pubkey: hexZeroPad('0x18', 98),
    status: ValidatorStatus.ACTIVE_ONGOING,
  },
];

export const operatorOneValidatorsExitList = [
  {
    validatorIndex: 1,
    key: hexZeroPad('0x12', 98),
  },
  {
    validatorIndex: 4,
    key: hexZeroPad('0x14', 98),
  },
  {
    validatorIndex: 5,
    key: hexZeroPad('0x15', 98),
  },
  {
    validatorIndex: 6,
    key: hexZeroPad('0x16', 98),
  },
  {
    validatorIndex: 7,
    key: hexZeroPad('0x17', 98),
  },
  {
    validatorIndex: 8,
    key: hexZeroPad('0x18', 98),
  },
];

export const operatorOnePresignMessageList = [
  {
    validatorIndex: 1,
    epoch: 2860,
  },
  {
    validatorIndex: 4,
    epoch: 2860,
  },
  {
    validatorIndex: 5,
    epoch: 2860,
  },
  {
    validatorIndex: 6,
    epoch: 2860,
  },
  {
    validatorIndex: 7,
    epoch: 2860,
  },
  {
    validatorIndex: 8,
    epoch: 2860,
  },
];
