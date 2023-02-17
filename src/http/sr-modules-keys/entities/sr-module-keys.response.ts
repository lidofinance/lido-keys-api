import { ApiProperty, getSchemaPath, ApiExtraModels } from '@nestjs/swagger';
import { SRModule, RegistryKey, ELMeta } from 'http/common/entities/';

type SRModuleKey = RegistryKey;

@ApiExtraModels(RegistryKey)
export class SRKeyListWithModule {
  @ApiProperty({
    type: 'array',
    items: { oneOf: [{ $ref: getSchemaPath(RegistryKey) }] },
    description: 'Keys of staking router module',
  })
  keys!: SRModuleKey[];

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
  data!: SRKeyListWithModule | null;

  @ApiProperty({
    nullable: true,
    type: () => ELMeta,
  })
  meta!: ELMeta | null;
}
