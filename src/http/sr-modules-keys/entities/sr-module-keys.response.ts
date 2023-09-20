import { ApiProperty, ApiExtraModels } from '@nestjs/swagger';
import { SRModule, Key, ELMeta } from '../../common/entities/';

@ApiExtraModels(Key)
export class SRKeyListWithModule {
  @ApiProperty({
    type: () => [Key],
    description: 'Keys of staking router module',
  })
  keys!: Key[];

  @ApiProperty({
    description: 'Detailed Staking Router information',
    type: () => SRModule,
  })
  module!: SRModule;
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
