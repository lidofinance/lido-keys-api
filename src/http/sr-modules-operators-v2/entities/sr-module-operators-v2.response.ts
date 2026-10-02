import { ApiProperty } from '@nestjs/swagger';
import { StakingModuleResponse, ELMeta } from '../../common/entities/';
import { OperatorV2 } from './operator-v2';

export class OperatorListAndSRModuleV2 {
  @ApiProperty({
    type: () => [OperatorV2],
    required: true,
    description: 'Operators of staking router module',
  })
  operators!: OperatorV2[];

  @ApiProperty({
    type: () => StakingModuleResponse,
    required: true,
    description: 'Detailed Staking Router information',
  })
  module!: StakingModuleResponse;
}

export class SRModuleOperatorListResponseV2 {
  @ApiProperty({
    type: () => OperatorListAndSRModuleV2,
    required: true,
    description: 'Staking router module operators',
  })
  data!: OperatorListAndSRModuleV2;

  @ApiProperty({
    type: () => ELMeta,
    required: true,
    description: 'Meta',
  })
  meta!: ELMeta;
}
