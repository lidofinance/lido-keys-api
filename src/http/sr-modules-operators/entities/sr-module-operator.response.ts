import { ApiProperty, getSchemaPath, ApiExtraModels } from '@nestjs/swagger';
import { SRModule, CuratedOperator, ELMeta } from 'http/common/entities/';
import { SRModuleOperator } from 'http/common/entities/sr-module-operator';

@ApiExtraModels(CuratedOperator)
export class OperatorAndSRModule {
  @ApiProperty({
    oneOf: [{ $ref: getSchemaPath(CuratedOperator) }],
    description: 'Operator of staking router module',
  })
  operator!: SRModuleOperator;

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
