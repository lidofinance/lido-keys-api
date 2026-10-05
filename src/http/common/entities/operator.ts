import { ApiProperty } from '@nestjs/swagger';

import { RegistryOperator } from '../../../common/registry';
import { addressToChecksum } from '../utils';

export class Operator implements Omit<RegistryOperator, 'finalizedUsedSigningKeys'> {
  constructor(operator: RegistryOperator) {
    this.name = operator.name;
    this.rewardAddress = operator.rewardAddress;
    this.stakingLimit = operator.stakingLimit;
    this.stoppedValidators = operator.stoppedValidators;
    this.totalSigningKeys = operator.totalSigningKeys;
    this.usedSigningKeys = operator.usedSigningKeys;
    this.index = operator.index;
    this.active = operator.active;
    this.moduleAddress = addressToChecksum(operator.moduleAddress);
    this.depositableValidatorsCount = operator.depositableValidatorsCount;
    // NULL for curated (NOR) modules that do not expose this counter on-chain; the field is then omitted from the response.
    // A genuine 0 of community/CSM implementation modules is preserved.
    if (operator.totalWithdrawnKeys != null) {
      this.totalWithdrawnKeys = operator.totalWithdrawnKeys;
    }
  }

  @ApiProperty({
    required: true,
    description: 'Index of Operator',
  })
  index: number;

  @ApiProperty({
    required: true,
    description: 'This value shows if node operator active',
  })
  active: boolean;

  @ApiProperty({
    required: true,
    description: 'Operator name',
  })
  name: string;

  @ApiProperty({
    required: true,
    description: 'Ethereum 1 address which receives stETH rewards for this operator',
  })
  rewardAddress: string;

  @ApiProperty({
    required: true,
    description: 'The number of keys vetted by the DAO and that can be used for the deposit',
  })
  stakingLimit: number;

  @ApiProperty({
    required: true,
    description: 'Amount of stopped validators',
  })
  stoppedValidators: number;

  @ApiProperty({
    required: true,
    description: 'Total signing keys amount',
  })
  totalSigningKeys: number;

  @ApiProperty({
    required: true,
    description: 'Amount of used signing keys',
  })
  usedSigningKeys: number;

  @ApiProperty({
    required: true,
    description: 'Module address',
  })
  moduleAddress: string;

  @ApiProperty({
    required: true,
    description: 'Number of validators that are ready for deposit',
  })
  depositableValidatorsCount: number;

  @ApiProperty({
    required: false,
    description:
      'Total number of withdrawn keys for the operator. Present only for community-onchain-v1 and curated-onchain-v2 module types',
  })
  totalWithdrawnKeys?: number;
}
