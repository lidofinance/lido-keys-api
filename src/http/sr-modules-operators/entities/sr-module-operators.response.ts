import { ApiProperty } from '@nestjs/swagger';
import { StakingModuleResponse, ELMeta, Operator } from '../../common/entities/';

export class OperatorListAndSRModule {
  @ApiProperty({
    type: () => [Operator],
    required: true,
    description: 'Operators of staking router module',
  })
  operators!: Operator[];

  @ApiProperty({
    type: () => StakingModuleResponse,
    required: true,
    description: 'Detailed Staking Router information',
  })
  module!: StakingModuleResponse;
}

export class SRModuleOperatorListResponse {
  @ApiProperty({
    type: () => OperatorListAndSRModule,
    required: true,
    description: 'Staking router module operators',
  })
  data!: OperatorListAndSRModule;

  @ApiProperty({
    type: () => ELMeta,
    required: true,
    description: 'Meta',
  })
  meta!: ELMeta;
}
