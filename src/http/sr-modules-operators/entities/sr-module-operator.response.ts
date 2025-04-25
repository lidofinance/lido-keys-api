import { ApiProperty } from '@nestjs/swagger';
import { StakingModuleResponse, ELMeta, Operator } from '../../common/entities/';

export class OperatorAndSRModule {
  @ApiProperty({
    type: () => Operator,
    required: true,
    description: 'Operator of staking router module',
  })
  operator!: Operator;

  @ApiProperty({
    type: () => StakingModuleResponse,
    required: true,
    description: 'Detailed Staking Router information',
  })
  module!: StakingModuleResponse;
}

export class SRModuleOperatorResponse {
  @ApiProperty({
    type: () => OperatorAndSRModule,
    required: true,
    description: 'Staking router module keys',
  })
  data!: OperatorAndSRModule;

  @ApiProperty({
    type: () => ELMeta,
    required: true,
    description: 'Meta',
  })
  meta!: ELMeta;
}
