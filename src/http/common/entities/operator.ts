import { ApiProperty } from '@nestjs/swagger';

import { RegistryOperator } from '../../../common/registry';

export class Operator implements RegistryOperator {
  constructor(operator: RegistryOperator) {
    this.name = operator.name;
    this.rewardAddress = operator.rewardAddress;
    this.stakingLimit = operator.stakingLimit;
    this.stoppedValidators = operator.stoppedValidators;
    this.totalSigningKeys = operator.totalSigningKeys;
    this.usedSigningKeys = operator.usedSigningKeys;
    this.index = operator.index;
    this.active = operator.active;
    this.moduleAddress = operator.moduleAddress;
  }

  @ApiProperty({
    description: 'Index of Operator',
  })
  index: number;

  @ApiProperty({
    description: 'This value shows if node operator active',
  })
  active: boolean;

  @ApiProperty({ description: 'Operator name' })
  name: string;

  @ApiProperty({ description: 'Ethereum 1 address which receives stETH rewards for this operator' })
  rewardAddress: string;

  @ApiProperty({ description: 'The maximum number of validators to stake for this operator' })
  stakingLimit: number;

  @ApiProperty({ description: 'Amount of stopped validators' })
  stoppedValidators: number;

  @ApiProperty({ description: 'Total signing keys amount' })
  totalSigningKeys: number;

  @ApiProperty({ description: 'Amount of used signing keys' })
  usedSigningKeys: number;

  @ApiProperty({
    required: true,
    description: 'Module address',
  })
  moduleAddress: string;
}
