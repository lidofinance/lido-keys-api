import { ApiProperty, ApiExtraModels } from '@nestjs/swagger';
import { SRModule, ELMeta, Operator } from '../../common/entities/';

@ApiExtraModels(Operator)
export class OperatorListAndSRModule {
  @ApiProperty({
    type: () => [Operator],
    description: 'Operators of staking router module',
  })
  operators!: Operator[];

  @ApiProperty({
    description: 'Detailed Staking Router information',
    type: () => SRModule,
  })
  module!: SRModule;
}

export class SRModuleOperatorListResponse {
  @ApiProperty({
    description: 'Staking router module operators.',
    nullable: true,
    type: () => OperatorListAndSRModule,
  })
  data!: OperatorListAndSRModule;

  @ApiProperty({
    nullable: true,
    type: () => ELMeta,
  })
  meta!: ELMeta;
}
