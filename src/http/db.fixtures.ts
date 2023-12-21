import { RegistryKey, RegistryOperator } from '../common/registry';

import { AddressZero } from '@ethersproject/constants';
import { STAKING_MODULE_TYPE } from 'staking-router-modules/constants';
import { StakingModule } from '../staking-router-modules/interfaces/staking-module.interface';

export const curatedModule: StakingModule = {
  moduleId: 1,
  stakingModuleAddress: '0xdc64a140aa3e981100a9beca4e685f962f0cf6c9',
  moduleFee: 100,
  treasuryFee: 100,
  targetShare: 100,
  status: 0,
  name: 'curated-onchain-v1',
  type: 'curated-onchain-v1' as STAKING_MODULE_TYPE,
  lastDepositAt: 1691500732,
  lastDepositBlock: 9,
  exitedValidatorsCount: 0,
  active: true,
  lastChangedBlockHash: '',
};

export const dvtModule: StakingModule = {
  moduleId: 2,
  stakingModuleAddress: '0x0165878a594ca255338adfa4d48449f69242eb8f',
  moduleFee: 100,
  treasuryFee: 100,
  targetShare: 100,
  status: 0,
  name: 'simple-dvt-onchain-v1',
  type: 'curated-onchain-v1' as STAKING_MODULE_TYPE,
  lastDepositAt: 1691500733,
  lastDepositBlock: 10,
  exitedValidatorsCount: 0,
  active: true,
  lastChangedBlockHash: '',
};

export const updatedCuratedModule: StakingModule = {
  moduleId: 1,
  stakingModuleAddress: '0xec65a140aa3e981100a9beca4e685f962f0cf6c9',
  moduleFee: 1000,
  treasuryFee: 1000,
  targetShare: 1000,
  status: 1,
  name: 'curated-onchain-v1',
  type: 'curated-onchain-v1' as STAKING_MODULE_TYPE,
  lastDepositAt: 1691500733,
  lastDepositBlock: 10,
  exitedValidatorsCount: 1,
  active: false,
  lastChangedBlockHash: '',
};
export const srModules = [curatedModule, dvtModule];

export const dvtModuleKeys: RegistryKey[] = [
  {
    operatorIndex: 1,
    index: 1,
    moduleAddress: dvtModule.stakingModuleAddress,
    key: '0xa544bc44d9eacbf4dd6a2d6087b43f4c67fd5618651b97effcb30997bf49e5d7acf0100ef14e5d087cc228bc78d498e6',
    depositSignature:
      '0x967875a0104d9f674538e2ec0df4be0a61ef08061cdcfa83e5a63a43dadb772d29053368224e5d8e046ba1a78490f5fc0f0186f23af0465d0a82b2db2e7535782fe12e1fd1cd4f6eb77d8dc7a4f7ab0fde31435d5fa98a013e0a716c5e1ef6a2',
    used: true,
  },
  {
    operatorIndex: 1,
    index: 2,
    moduleAddress: dvtModule.stakingModuleAddress,
    key: '0xb3e9f4e915f9fb9ef9c55da1815071f3f728cc6fc434fba2c11e08db5b5fa22b71d5975cec30ef97e7fc901e5a04ee5b',
    depositSignature:
      '0xb048f4a409d5a0aa638e5ec65c21e936ffde9a8d848e74e6b2f6972a4145620dc78c79db5425ea1a5c6b1dd8d50fc77f0bcec894c0a9446776936f2adf4f1dc7056fb3c4bdf9dbd00981288d4e582875d10b13d780dddc642496e97826abd3c7',
    used: false,
  },
  {
    operatorIndex: 1,
    index: 7,
    moduleAddress: dvtModule.stakingModuleAddress,
    key: '0xb3b9f4e915f9fb9ef9c55da1815071f3f728cc6fc434fba2c11e08db5b5fa22b71d5975cec30ef97e7fc901e5a04ee5b',
    depositSignature:
      '0xb048f4a409d5a0aa638e5ec65c21e936ffde9a8d848e74e6b2f6972a4145620dc78c79db5425ea1a5c6b1dd8d50fc77f0bcec894c0a9446776936f2adf4f1dc7056fb3c4bdf9dbd00981288d4e582875d10b13d780dddc642496e97826abd3c7',
    used: true,
  },
  {
    operatorIndex: 1,
    index: 8,
    moduleAddress: dvtModule.stakingModuleAddress,
    key: '0xc3e9f4e915f9fb9ef9c55da1815071f3f728cc6fc434fba2c11e08db5b5fa22b71d5975cec30ef97e7fc901e5a04ee5b',
    depositSignature:
      '0xb048f4a409d5a0aa638e5ec65c21e936ffde9a8d848e74e6b2f6972a4145620dc78c79db5425ea1a5c6b1dd8d50fc77f0bcec894c0a9446776936f2adf4f1dc7056fb3c4bdf9dbd00981288d4e582875d10b13d780dddc642496e97826abd3c7',
    used: true,
  },
  {
    operatorIndex: 1,
    index: 9,
    moduleAddress: dvtModule.stakingModuleAddress,
    key: '0xd3e9f4e915f9fb9ef9c55da1815071f3f728cc6fc434fba2c11e08db5b5fa22b71d5975cec30ef97e7fc901e5a04ee5b',
    depositSignature:
      '0xb048f4a409d5a0aa638e5ec65c21e936ffde9a8d848e74e6b2f6972a4145620dc78c79db5425ea1a5c6b1dd8d50fc77f0bcec894c0a9446776936f2adf4f1dc7056fb3c4bdf9dbd00981288d4e582875d10b13d780dddc642496e97826abd3c7',
    used: true,
  },
  {
    operatorIndex: 1,
    index: 10,
    moduleAddress: dvtModule.stakingModuleAddress,
    key: '0xe3e9f4e915f9fb9ef9c55da1815071f3f728cc6fc434fba2c11e08db5b5fa22b71d5975cec30ef97e7fc901e5a04ee5b',
    depositSignature:
      '0xb048f4a409d5a0aa638e5ec65c21e936ffde9a8d848e74e6b2f6972a4145620dc78c79db5425ea1a5c6b1dd8d50fc77f0bcec894c0a9446776936f2adf4f1dc7056fb3c4bdf9dbd00981288d4e582875d10b13d780dddc642496e97826abd3c7',
    used: true,
  },
  {
    operatorIndex: 1,
    index: 11,
    moduleAddress: dvtModule.stakingModuleAddress,
    key: '0xf3e9f4e915f9fb9ef9c55da1815071f3f728cc6fc434fba2c11e08db5b5fa22b71d5975cec30ef97e7fc901e5a04ee5b',
    depositSignature:
      '0xb048f4a409d5a0aa638e5ec65c21e936ffde9a8d848e74e6b2f6972a4145620dc78c79db5425ea1a5c6b1dd8d50fc77f0bcec894c0a9446776936f2adf4f1dc7056fb3c4bdf9dbd00981288d4e582875d10b13d780dddc642496e97826abd3c7',
    used: true,
  },
  {
    operatorIndex: 1,
    index: 12,
    moduleAddress: dvtModule.stakingModuleAddress,
    key: '0xa5e9f4e915f9fb9ef9c55da1815071f3f728cc6fc434fba2c11e08db5b5fa22b71d5975cec30ef97e7fc901e5a04ee5b',
    depositSignature:
      '0xb048f4a409d5a0aa638e5ec65c21e936ffde9a8d848e74e6b2f6972a4145620dc78c79db5425ea1a5c6b1dd8d50fc77f0bcec894c0a9446776936f2adf4f1dc7056fb3c4bdf9dbd00981288d4e582875d10b13d780dddc642496e97826abd3c7',
    used: true,
  },
  {
    operatorIndex: 1,
    index: 13,
    moduleAddress: dvtModule.stakingModuleAddress,
    key: '0xb6e9f4e915f9fb9ef9c55da1815071f3f728cc6fc434fba2c11e08db5b5fa22b71d5975cec30ef97e7fc901e5a04ee5b',
    depositSignature:
      '0xb048f4a409d5a0aa638e5ec65c21e936ffde9a8d848e74e6b2f6972a4145620dc78c79db5425ea1a5c6b1dd8d50fc77f0bcec894c0a9446776936f2adf4f1dc7056fb3c4bdf9dbd00981288d4e582875d10b13d780dddc642496e97826abd3c7',
    used: true,
  },
  {
    operatorIndex: 1,
    index: 14,
    moduleAddress: dvtModule.stakingModuleAddress,
    key: '0xc7e9f4e915f9fb9ef9c55da1815071f3f728cc6fc434fba2c11e08db5b5fa22b71d5975cec30ef97e7fc901e5a04ee5b',
    depositSignature:
      '0xb048f4a409d5a0aa638e5ec65c21e936ffde9a8d848e74e6b2f6972a4145620dc78c79db5425ea1a5c6b1dd8d50fc77f0bcec894c0a9446776936f2adf4f1dc7056fb3c4bdf9dbd00981288d4e582875d10b13d780dddc642496e97826abd3c7',
    used: true,
  },
  {
    operatorIndex: 1,
    index: 15,
    moduleAddress: dvtModule.stakingModuleAddress,
    key: '0xd8e9f4e915f9fb9ef9c55da1815071f3f728cc6fc434fba2c11e08db5b5fa22b71d5975cec30ef97e7fc901e5a04ee5b',
    depositSignature:
      '0xb048f4a409d5a0aa638e5ec65c21e936ffde9a8d848e74e6b2f6972a4145620dc78c79db5425ea1a5c6b1dd8d50fc77f0bcec894c0a9446776936f2adf4f1dc7056fb3c4bdf9dbd00981288d4e582875d10b13d780dddc642496e97826abd3c7',
    used: true,
  },
  {
    operatorIndex: 1,
    index: 16,
    moduleAddress: dvtModule.stakingModuleAddress,
    key: '0xe9e9f4e915f9fb9ef9c55da1815071f3f728cc6fc434fba2c11e08db5b5fa22b71d5975cec30ef97e7fc901e5a04ee5b',
    depositSignature:
      '0xb048f4a409d5a0aa638e5ec65c21e936ffde9a8d848e74e6b2f6972a4145620dc78c79db5425ea1a5c6b1dd8d50fc77f0bcec894c0a9446776936f2adf4f1dc7056fb3c4bdf9dbd00981288d4e582875d10b13d780dddc642496e97826abd3c7',
    used: true,
  },
];

export const curatedKeyWithDuplicate: RegistryKey = {
  operatorIndex: 2,
  index: 5,
  moduleAddress: curatedModule.stakingModuleAddress,
  key: '0x91024d603575605569c212b00f375c8bad733a697b453fbe054bb996bd24c7d1a5b6034cc58943aeddab05cbdfd40632',
  depositSignature:
    '0x9990450099816e066c20b5947be6bf089b57fcfacfb2c8285ddfd6c678a44198bf7c013a0d1a6353ed19dd94423eef7b010d25aaa2c3093760c79bf247f5350120e8a74e4586eeba0f1e2bcf17806f705007d7b5862039da5cd93ee659280d77',
  used: true,
};

export const curatedModuleKeys: RegistryKey[] = [
  {
    operatorIndex: 1,
    index: 1,
    moduleAddress: curatedModule.stakingModuleAddress,
    key: '0xa554bc44d9eacbf4dd6a2d6087b43f4c67fd5618651b97effcb30997bf49e5d7acf0100ef14e5d087cc228bc78d498e6',
    depositSignature:
      '0x967875a0104d9f674538e2ec0df4be0a61ef08061cdcfa83e5a63a43dadb772d29053368224e5d8e046ba1a78490f5fc0f0186f23af0465d0a82b2db2e7535782fe12e1fd1cd4f6eb77d8dc7a4f7ab0fde31435d5fa98a013e0a716c5e1ef6a2',
    used: true,
  },
  {
    operatorIndex: 1,
    index: 2,
    moduleAddress: curatedModule.stakingModuleAddress,
    key: '0xb3a9f4e915f9fb9ef9c55da1815071f3f728cc6fc434fba2c11e08db5b5fa22b71d5975cec30ef97e7fc901e5a04ee5b',
    depositSignature:
      '0xb048f4a409d5a0aa638e5ec65c21e936ffde9a8d848e74e6b2f6972a4145620dc78c79db5425ea1a5c6b1dd8d50fc77f0bcec894c0a9446776936f2adf4f1dc7056fb3c4bdf9dbd00981288d4e582875d10b13d780dddc642496e97826abd3c7',
    used: true,
  },
  {
    operatorIndex: 1,
    index: 3,
    moduleAddress: curatedModule.stakingModuleAddress,
    key: '0x91524d603575605569c212b00f375c8bad733a697b453fbe054bb996bd24c7d1a5b6034cc58943aeddab05cbdfd40632',
    depositSignature:
      '0x9990450099816e066c20b5947be6bf089b57fcfacfb2c8285ddfd6c678a44198bf7c013a0d1a6353ed19dd94423eef7b010d25aaa2c3093760c79bf247f5350120e8a74e4586eeba0f1e2bcf17806f705007d7b5862039da5cd93ee659280d77',
    used: false,
  },
  {
    operatorIndex: 2,
    index: 4,
    moduleAddress: curatedModule.stakingModuleAddress,
    key: '0xa544bc44d8eacbf4dd6a2d6087b43f4c67fd5618651b97effcb30997bf49e5d7acf0100ef14e5d087cc228bc78d498e6',
    depositSignature:
      '0x967875a0104d1f674538e2ec0df4be0a61ef08061cdcfa83e5a63a43dadb772d29053368224e5d8e046ba1a78490f5fc0f0186f23af0465d0a82b2db2e7535782fe12e1fd1cd4f6eb77d8dc7a4f7ab0fde31435d5fa98a013e0a716c5e1ef6a2',
    used: true,
  },

  curatedKeyWithDuplicate,
  {
    ...curatedKeyWithDuplicate,
    index: 6,
  },
];

export const keys = [...dvtModuleKeys, ...curatedModuleKeys];

export const operatorOneCurated: RegistryOperator = {
  index: 1,
  active: true,
  name: 'test',
  rewardAddress: AddressZero,
  stoppedValidators: 0,
  stakingLimit: 1,
  usedSigningKeys: 2,
  totalSigningKeys: 3,
  moduleAddress: curatedModule.stakingModuleAddress,
  finalizedUsedSigningKeys: 2,
};

export const operatorTwoCurated: RegistryOperator = {
  index: 2,
  active: true,
  name: 'test',
  rewardAddress: AddressZero,
  stoppedValidators: 0,
  stakingLimit: 1,
  usedSigningKeys: 2,
  totalSigningKeys: 3,
  moduleAddress: curatedModule.stakingModuleAddress,
  finalizedUsedSigningKeys: 2,
};

export const operatorOneDvt: RegistryOperator = {
  index: 1,
  active: true,
  name: 'test',
  rewardAddress: AddressZero,
  stoppedValidators: 0,
  stakingLimit: 1,
  usedSigningKeys: 2,
  totalSigningKeys: 3,
  moduleAddress: dvtModule.stakingModuleAddress,
  finalizedUsedSigningKeys: 2,
};

export const operatorTwoDvt: RegistryOperator = {
  index: 2,
  active: true,
  name: 'test',
  rewardAddress: AddressZero,
  stoppedValidators: 0,
  stakingLimit: 1,
  usedSigningKeys: 2,
  totalSigningKeys: 3,
  moduleAddress: dvtModule.stakingModuleAddress,
  finalizedUsedSigningKeys: 2,
};

export const operators = [operatorOneCurated, operatorTwoCurated, operatorOneDvt, operatorTwoDvt];
