import { ApiProperty } from '@nestjs/swagger';
import { StakingModuleResponse, ELMeta } from '../../common/entities/';
import { CompoundingOperator } from './compounding-operator';

export class CompoundingOperatorListAndSRModule {
  @ApiProperty({
    type: () => [CompoundingOperator],
    required: true,
    description: 'Operators of compounding (0x02) staking router module',
  })
  operators!: CompoundingOperator[];

  @ApiProperty({
    type: () => StakingModuleResponse,
    required: true,
    description: 'Detailed Staking Router information',
  })
  module!: StakingModuleResponse;
}

export class SRModuleCompoundingOperatorListResponse {
  @ApiProperty({
    type: () => CompoundingOperatorListAndSRModule,
    required: true,
    description: 'Compounding staking router module operators',
  })
  data!: CompoundingOperatorListAndSRModule;

  @ApiProperty({
    type: () => ELMeta,
    required: true,
    description: 'Meta',
  })
  meta!: ELMeta;
}
