import { ApiProperty, ApiExtraModels, getSchemaPath } from '@nestjs/swagger';
import { Key, Operator, StakingModuleResponse, ELMeta } from '../../common/entities/';

@ApiExtraModels(Operator)
@ApiExtraModels(Key)
export class SROperatorsKeysModule {
  @ApiProperty({
    type: () => [Operator],
    description: 'Operators of staking router module',
  })
  operators!: Operator[];

  @ApiProperty({
    type: () => [Key],
    description: 'Keys of staking router module',
  })
  keys!: Key[];

  @ApiProperty({
    description: 'Detailed Staking Router information',
    type: () => StakingModuleResponse,
  })
  module!: StakingModuleResponse;
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

export class SRModulesOperatorsKeysStreamResponse {
  @ApiProperty({
    type: 'array',
    items: { oneOf: [{ $ref: getSchemaPath(Operator) }] },
    description: 'Operators of staking router module',
  })
  operators?: Operator[];

  @ApiProperty({
    type: 'array',
    items: { oneOf: [{ $ref: getSchemaPath(Key) }] },
    description: 'Keys of staking router module',
  })
  keys?: Key[];

  @ApiProperty({
    type: 'array',
    items: { oneOf: [{ $ref: getSchemaPath(StakingModuleResponse) }] },
    description: 'List of Staking Router',
  })
  modules?: StakingModuleResponse[];

  @ApiProperty({
    nullable: true,
    type: () => ELMeta,
  })
  meta?: ELMeta;
}
