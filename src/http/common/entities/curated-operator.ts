import { ApiProperty } from '@nestjs/swagger';
import { Operator } from 'http/common/entities/';
import { RegistryOperator } from 'common/registry';

export class CuratedOperator extends Operator {
  constructor(operator: RegistryOperator) {
    super(operator);
    this.name = operator.name;
    this.rewardAddress = operator.rewardAddress;
    this.stakingLimit = operator.stakingLimit;
    this.stoppedValidators = operator.stoppedValidators;
    this.totalSigningKeys = operator.totalSigningKeys;
    this.usedSigningKeys = operator.usedSigningKeys;
  }

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
}
