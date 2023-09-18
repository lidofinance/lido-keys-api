import { ApiProperty, getSchemaPath, ApiExtraModels } from '@nestjs/swagger';
import { Key, Operator, SRModule } from '../../common/entities/';
import { ELMeta } from '../../common/entities/';

@ApiExtraModels(Operator)
@ApiExtraModels(Key)
export class SROperatorsKeysModule {
  @ApiProperty({
    type: 'array',
    items: { oneOf: [{ $ref: getSchemaPath(Operator) }] },
    description: 'Operators of staking router module',
  })
  operators!: Operator[];

  @ApiProperty({
    type: 'array',
    items: { oneOf: [{ $ref: getSchemaPath(Key) }] },
    description: 'Keys of staking router module',
  })
  keys!: Key[];

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
  data!: SROperatorsKeysModule;

  @ApiProperty({
    nullable: true,
    type: () => ELMeta,
  })
  meta!: ELMeta;
}
