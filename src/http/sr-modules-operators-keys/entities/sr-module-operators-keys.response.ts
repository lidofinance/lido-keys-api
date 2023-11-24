import { ApiProperty } from '@nestjs/swagger';
import { Key, Operator, StakingModuleResponse, ELMeta } from '../../common/entities/';

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
    type: () => Operator,
    description: 'Operator of staking router module',
  })
  operator!: Operator | null;

  @ApiProperty({
    type: () => Key,
    description: 'Key of staking router module',
  })
  key!: Key | null;

  @ApiProperty({
    type: () => StakingModuleResponse,
    description: 'Staking Router module',
  })
  stakingModule!: StakingModuleResponse | null;

  @ApiProperty({
    nullable: true,
    type: () => ELMeta,
  })
  meta!: ELMeta | null;
}
