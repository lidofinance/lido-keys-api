import { StakingModule } from 'staking-router-modules/interfaces/staking-module.interface';

export const stakingModuleFixture: StakingModule = {
  moduleId: 1,
  stakingModuleAddress: '0x123456789abcdef',
  moduleFee: 0.02,
  treasuryFee: 0.01,
  targetShare: 500,
  status: 1,
  name: 'Staking Module 1',
  lastDepositAt: Date.now() - 86400000, // 24 hours ago
  lastDepositBlock: 12345,
  exitedValidatorsCount: 10,
  type: 'curated',
  active: true,
  withdrawalCredentialsType: 1,
};

export const stakingModuleFixtures: StakingModule[] = [
  stakingModuleFixture,
  {
    moduleId: 2,
    stakingModuleAddress: '0x987654321fedcba',
    moduleFee: 0.01,
    treasuryFee: 0.005,
    targetShare: 750,
    status: 0,
    name: 'Staking Module 2',
    lastDepositAt: Date.now() - 172800000, // 48 hours ago
    lastDepositBlock: 23456,
    exitedValidatorsCount: 5,
    type: 'dvt',
    active: false,
    withdrawalCredentialsType: 1,
  },
];
