import { ApiProperty, getSchemaPath, ApiExtraModels } from '@nestjs/swagger';
import { SRModule } from 'http/common/response-entities/staking-module';
import { ELMeta } from 'http/common/response-entities/meta';
import { StakingModuleOperatorResponse, CuratedOperatorResponse } from 'http/common/response-entities/operators';

@ApiExtraModels(CuratedOperatorResponse)
export class OperatorListAndSRModule {
  @ApiProperty({
    type: 'array',
    items: { oneOf: [{ $ref: getSchemaPath(CuratedOperatorResponse) }] },
    description: 'Operators of staking router module',
  })
  operators!: StakingModuleOperatorResponse[];

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
