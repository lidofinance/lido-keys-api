import { ApiProperty, getSchemaPath, ApiExtraModels } from '@nestjs/swagger';
import { SRModule } from 'http/common/response-entities';
import { CuratedKey } from 'http/common/response-entities';
import { CuratedOperator } from 'http/common/response-entities';
import { ELMeta } from 'http/common/response-entities';

type SRModuleOperator = CuratedOperator;
type SRModuleKey = CuratedKey;

@ApiExtraModels(CuratedOperator)
@ApiExtraModels(CuratedKey)
export class SROperatorsKeysModule {
  @ApiProperty({
    type: 'array',
    items: { oneOf: [{ $ref: getSchemaPath(CuratedOperator) }] },
    description: 'Operators of staking router module',
  })
  operators!: SRModuleOperator[];

  @ApiProperty({
    type: 'array',
    items: { oneOf: [{ $ref: getSchemaPath(CuratedKey) }] },
    description: 'Keys of staking router module',
  })
  keys!: SRModuleKey[];

  @ApiProperty({
    description: 'Detailed Staking Router information',
    type: () => SRModule,
  })
  module!: SRModule;
}

export class SRModuleOperatorsKeysResponse {
  @ApiProperty({
    description: 'Staking router module keys.',
    nullable: true,
    type: () => SROperatorsKeysModule,
  })
  data!: SROperatorsKeysModule | null;

  @ApiProperty({
    nullable: true,
    type: () => ELMeta,
  })
  meta!: ELMeta | null;
}
