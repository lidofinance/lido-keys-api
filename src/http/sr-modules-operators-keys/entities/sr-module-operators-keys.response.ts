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
    type: () => [Operator],
    description: 'Operators of staking router module',
  })
  operators?: Operator[];

  @ApiProperty({
    type: () => [Key],
    description: 'Keys of staking router module',
  })
  keys?: Key[];

  @ApiProperty({
    type: () => StakingModuleResponse,
    description: 'List of Staking Router',
  })
  modules?: StakingModuleResponse[];

  @ApiProperty({
    nullable: true,
    type: () => ELMeta,
  })
  meta?: ELMeta;
}
