import { ApiProperty, ApiExtraModels } from '@nestjs/swagger';
import { SRModule, ELMeta, Operator } from '../../common/entities/';

@ApiExtraModels(Operator)
export class OperatorAndSRModule {
  @ApiProperty({
    type: () => [Operator],
    description: 'Operator of staking router module',
  })
  operator!: Operator;

  @ApiProperty({
    description: 'Detailed Staking Router information',
    type: () => SRModule,
  })
  module!: SRModule;
}

export class SRModuleOperatorResponse {
  @ApiProperty({
    description: 'Staking router module keys.',
    nullable: true,
    type: () => OperatorAndSRModule,
  })
  data!: OperatorAndSRModule;

  @ApiProperty({
    nullable: true,
    type: () => ELMeta,
  })
  meta!: ELMeta;
}
