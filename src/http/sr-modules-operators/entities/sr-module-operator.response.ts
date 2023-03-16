import { ApiProperty, getSchemaPath, ApiExtraModels } from '@nestjs/swagger';
import { ELMeta } from 'http/common/response-entities/meta';
import { SRModule } from 'http/common/response-entities/staking-module';
import { StakingModuleOperatorResponse, CuratedOperatorResponse } from 'http/common/response-entities/operators';

@ApiExtraModels(CuratedOperatorResponse)
export class OperatorAndSRModule {
  @ApiProperty({
    oneOf: [{ $ref: getSchemaPath(CuratedOperatorResponse) }],
    description: 'Operator of staking router module',
  })
  operator!: StakingModuleOperatorResponse;

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
  data!: OperatorAndSRModule | null;

  @ApiProperty({
    nullable: true,
    type: () => ELMeta,
  })
  meta!: ELMeta | null;
}
