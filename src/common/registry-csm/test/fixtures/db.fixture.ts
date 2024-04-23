export const meta = {
  blockNumber: 14972649,
  blockHash: '0xe3c5882d92e18c0c1d1a2da47bff12790832577beba9df79289f333324495937',
  keysOpIndex: 2229,
  timestamp: 1655373008,
};

export const operators = [
  {
    index: 0,
    active: true,
    name: 'staking facilities',
    rewardAddress: '0xdd4bc51496dc93a0c47008e820e0d80745476f22',
    stakingLimit: 8400,
    stoppedValidators: 0,
    totalSigningKeys: 3,
    usedSigningKeys: 3,
    finalizedUsedSigningKeys: 3,
  },
  {
    index: 1,
    active: true,
    name: 'certus one',
    rewardAddress: '0x8d689476eb446a1fb0065bffac32398ed7f89165',
    stakingLimit: 1000,
    stoppedValidators: 0,
    totalSigningKeys: 3,
    usedSigningKeys: 3,
    finalizedUsedSigningKeys: 3,
  },
];

export const keys = [
  {
    operatorIndex: 0,
    index: 0,
    key: '0xa544bc44d9eacbf4dd6a2d6087b43f4c67fd5618651b97effcb30997bf49e5d7acf0100ef14e5d087cc228bc78d498e6',
    depositSignature:
      '0x967875a0104d9f674538e2ec0df4be0a61ef08061cdcfa83e5a63a43dadb772d29053368224e5d8e046ba1a78490f5fc0f0186f23af0465d0a82b2db2e7535782fe12e1fd1cd4f6eb77d8dc7a4f7ab0fde31435d5fa98a013e0a716c5e1ef6a2',
    used: true,
  },
  {
    operatorIndex: 0,
    index: 1,
    key: '0xb3e9f4e915f9fb9ef9c55da1815071f3f728cc6fc434fba2c11e08db5b5fa22b71d5975cec30ef97e7fc901e5a04ee5b',
    depositSignature:
      '0xb048f4a409d5a0aa638e5ec65c21e936ffde9a8d848e74e6b2f6972a4145620dc78c79db5425ea1a5c6b1dd8d50fc77f0bcec894c0a9446776936f2adf4f1dc7056fb3c4bdf9dbd00981288d4e582875d10b13d780dddc642496e97826abd3c7',
    used: true,
  },
  {
    operatorIndex: 0,
    index: 2,
    key: '0x91524d603575605569c212b00f375c8bad733a697b453fbe054bb996bd24c7d1a5b6034cc58943aeddab05cbdfd40632',
    depositSignature:
      '0x9990450099816e066c20b5947be6bf089b57fcfacfb2c8285ddfd6c678a44198bf7c013a0d1a6353ed19dd94423eef7b010d25aaa2c3093760c79bf247f5350120e8a74e4586eeba0f1e2bcf17806f705007d7b5862039da5cd93ee659280d77',
    used: true,
  },
  {
    operatorIndex: 1,
    index: 0,
    key: '0xa544bc44d9eacbf4dd6a2d6087b43f4c67fd5618651b97effcb30997bf49e5d7acf0100ef14e5d087cc228bc78d498e6',
    depositSignature:
      '0x967875a0104d9f674538e2ec0df4be0a61ef08061cdcfa83e5a63a43dadb772d29053368224e5d8e046ba1a78490f5fc0f0186f23af0465d0a82b2db2e7535782fe12e1fd1cd4f6eb77d8dc7a4f7ab0fde31435d5fa98a013e0a716c5e1ef6a2',
    used: true,
  },
  {
    operatorIndex: 1,
    index: 1,
    key: '0xb3e9f4e915f9fb9ef9c55da1815071f3f728cc6fc434fba2c11e08db5b5fa22b71d5975cec30ef97e7fc901e5a04ee5b',
    depositSignature:
      '0xb048f4a409d5a0aa638e5ec65c21e936ffde9a8d848e74e6b2f6972a4145620dc78c79db5425ea1a5c6b1dd8d50fc77f0bcec894c0a9446776936f2adf4f1dc7056fb3c4bdf9dbd00981288d4e582875d10b13d780dddc642496e97826abd3c7',
    used: true,
  },
  {
    operatorIndex: 1,
    index: 2,
    key: '0x91524d603575605569c212b00f375c8bad733a697b453fbe054bb996bd24c7d1a5b6034cc58943aeddab05cbdfd40632',
    depositSignature:
      '0x9990450099816e066c20b5947be6bf089b57fcfacfb2c8285ddfd6c678a44198bf7c013a0d1a6353ed19dd94423eef7b010d25aaa2c3093760c79bf247f5350120e8a74e4586eeba0f1e2bcf17806f705007d7b5862039da5cd93ee659280d77',
    used: true,
  },
];

export const newKey = {
  operatorIndex: 0,
  index: 3,
  key: '0xa544bc44d8eacbf4dd6a2d6087b43f4c67fd5618651b97effcb30997bf49e5d7acf0100ef14e5d087cc228bc78d498e6',
  depositSignature:
    '0x967875a0104d1f674538e2ec0df4be0a61ef08061cdcfa83e5a63a43dadb772d29053368224e5d8e046ba1a78490f5fc0f0186f23af0465d0a82b2db2e7535782fe12e1fd1cd4f6eb77d8dc7a4f7ab0fde31435d5fa98a013e0a716c5e1ef6a2',
  used: true,
};

export const usedSigningKeys = [...keys.slice(1, 2), ...keys.slice(4, 5)];

export const newOperator = {
  index: 2,
  active: true,
  name: 'certus two',
  rewardAddress: '0x8d689476eba46a1fb0065bffac32398ed7f89165',
  stakingLimit: 1000,
  stoppedValidators: 0,
  totalSigningKeys: 3,
  usedSigningKeys: 3,
  finalizedUsedSigningKeys: 3,
};

export const operatorWithDefaultsRecords = {
  index: 3,
  active: true,
  name: 'default',
  rewardAddress: '0x8d689476eba46a1fb0065bffac32398ed7f89165',
  stakingLimit: 0,
  stoppedValidators: 0,
  totalSigningKeys: 0,
  usedSigningKeys: 0,
  finalizedUsedSigningKeys: 0,
};
