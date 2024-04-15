import { ApiProperty } from '@nestjs/swagger';
import { Key, StakingModuleResponse, ELMeta } from '../../common/entities/';

export class KeyListWithModule {
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

export class GroupedByModuleKeyListResponse {
  @ApiProperty({
    type: () => [KeyListWithModule],
    required: true,
    description: 'Keys for all modules grouped by staking router module',
  })
  data!: KeyListWithModule[];

  @ApiProperty({
    type: () => ELMeta,
    required: true,
    description: 'Meta',
  })
  meta!: ELMeta;
}
