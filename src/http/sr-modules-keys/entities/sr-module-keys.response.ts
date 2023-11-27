import { ApiProperty } from '@nestjs/swagger';
import { StakingModuleResponse, Key, ELMeta } from '../../common/entities/';

export class SRKeyListWithModule {
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

export class SRModuleKeyListResponse {
  @ApiProperty({
    description: 'Staking router module keys.',
    nullable: true,
    type: () => SRKeyListWithModule,
  })
  data!: SRKeyListWithModule;

  @ApiProperty({
    nullable: true,
    type: () => ELMeta,
  })
  meta!: ELMeta;
}
