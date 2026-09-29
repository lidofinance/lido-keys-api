import { ApiProperty } from '@nestjs/swagger';

import { RegistryOperator } from '../../../common/registry';
import { addressToChecksum } from '../../common/utils';

// Operator view for modules served by the community/CSM implementation.
// Compared to `Operator` it drops `stoppedValidators` (for these modules that field
// only mirrors exited keys and is semantically misleading) and adds `totalWithdrawnKeys`.
export class OperatorV2
  implements Omit<RegistryOperator, 'finalizedUsedSigningKeys' | 'stoppedValidators' | 'totalWithdrawnKeys'>
{
  constructor(operator: RegistryOperator) {
    this.name = operator.name;
    this.rewardAddress = operator.rewardAddress;
    this.stakingLimit = operator.stakingLimit;
    this.totalSigningKeys = operator.totalSigningKeys;
    this.usedSigningKeys = operator.usedSigningKeys;
    this.index = operator.index;
    this.active = operator.active;
    this.moduleAddress = addressToChecksum(operator.moduleAddress);
    this.depositableValidatorsCount = operator.depositableValidatorsCount;
    // Non-null assertion is safe: this endpoint only serves modules of the community/CSM implementation
    // (other module types are rejected with 404 upstream), and the community/CSM fetch always sets this counter.
    // The field is optional on the shared type only because curated (NOR) operators leave it NULL.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.totalWithdrawnKeys = operator.totalWithdrawnKeys!;
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
    required: true,
    description: 'Total number of withdrawn keys for the operator',
  })
  totalWithdrawnKeys: number;
}
