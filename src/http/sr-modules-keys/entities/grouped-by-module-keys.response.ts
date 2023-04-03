import { ApiProperty } from '@nestjs/swagger';
import { Key, SRModule, ELMeta } from 'http/common/entities/';

export class KeyListWithModule {
  @ApiProperty({
    description: 'Keys of staking router module',
    type: () => [Key],
  })
  keys!: Key[];

  @ApiProperty({
    description: 'Detailed Staking Router information',
    type: () => SRModule,
  })
  module!: SRModule;
}

export class GroupedByModuleKeyListResponse {
  @ApiProperty({
    description: 'Keys for all modules grouped by staking router module',
    type: () => [KeyListWithModule],
  })
  data!: KeyListWithModule[];

  @ApiProperty({
    nullable: true,
    type: () => ELMeta,
  })
  meta!: ELMeta;
}
