import { ApiProperty, getSchemaPath, ApiExtraModels } from '@nestjs/swagger';
import { SRModule, CuratedOperator, ELMeta } from 'http/common/entities/';
import { SRModuleOperator } from 'http/common/entities/sr-module-operator';

@ApiExtraModels(CuratedOperator)
export class OperatorListAndSRModule {
  @ApiProperty({
    type: 'array',
    items: { oneOf: [{ $ref: getSchemaPath(CuratedOperator) }] },
    description: 'Operators of staking router module',
  })
  operators!: SRModuleOperator[];

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
  data!: OperatorListAndSRModule | null;

  @ApiProperty({
    nullable: true,
    type: () => ELMeta,
  })
  meta!: ELMeta | null;
}
