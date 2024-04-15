import { ApiProperty } from '@nestjs/swagger';
import { StakingModuleResponse, Key, ELMeta } from '../../common/entities/';

export class SRKeyListWithModule {
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

export class SRModuleKeyListResponse {
  @ApiProperty({
    type: () => SRKeyListWithModule,
    required: true,
    description: 'Staking router module keys',
  })
  data!: SRKeyListWithModule;

  @ApiProperty({
    type: () => ELMeta,
    required: true,
    description: 'Meta',
  })
  meta!: ELMeta;
}
