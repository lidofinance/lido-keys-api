import { ApiProperty } from '@nestjs/swagger';
import { Key, Operator, StakingModuleResponse, ELMeta } from '../../common/entities/';

export class SROperatorsKeysModule {
  @ApiProperty({
    type: () => [Operator],
    required: true,
    description: 'Operators of staking router module',
  })
  operators!: Operator[];

  @ApiProperty({
    type: () => [Key],
    required: true,
    description: 'Keys of staking router module',
  })
  keys!: Key[];

  @ApiProperty({
    type: () => StakingModuleResponse,
    required: true,
    description: 'Detailed Staking Router information',
  })
  module!: StakingModuleResponse;
}

export class SRModuleOperatorsKeysResponse {
  @ApiProperty({
    type: () => SROperatorsKeysModule,
    required: true,
    description: 'Staking router module keys',
  })
  data!: SROperatorsKeysModule;

  @ApiProperty({
    type: () => ELMeta,
    required: true,
    description: 'Meta',
  })
  meta!: ELMeta;
}

export class SRModulesOperatorsKeysStreamResponse {
  @ApiProperty({
    type: () => Operator,
    nullable: true,
    description: 'Operator of staking router module',
  })
  operator!: Operator | null;

  @ApiProperty({
    type: () => Key,
    nullable: true,
    description: 'Key of staking router module',
  })
  key!: Key | null;

  @ApiProperty({
    type: () => StakingModuleResponse,
    nullable: true,
    description: 'Staking Router module',
  })
  stakingModule!: StakingModuleResponse | null;

  @ApiProperty({
    type: () => ELMeta,
    nullable: true,
    description: 'Meta',
  })
  meta!: ELMeta | null;
}
