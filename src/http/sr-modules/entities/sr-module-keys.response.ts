import { ApiProperty, getSchemaPath, ApiExtraModels } from '@nestjs/swagger';
import { Meta } from './meta';
import { RegistryKey } from './registry.key';
import { SRModule } from 'http/common/entities/';

type SRModuleKey = RegistryKey;

@ApiExtraModels(RegistryKey)
export class SRKeyListWithModule {
  @ApiProperty({
    type: 'array',
    items: { oneOf: [{ $ref: getSchemaPath(RegistryKey) }] },
    description: 'Keys of staking router module',
  })
  keys: SRModuleKey[];

  @ApiProperty({
    description: 'Detailed Staking Router information',
    type: () => SRModule,
  })
  module: SRModule;
}

export class SRModuleKeysResponse {
  @ApiProperty({
    description: 'Staking router module keys.',
    type: () => SRKeyListWithModule,
  })
  data: SRKeyListWithModule;

  @ApiProperty({
    type: () => Meta,
  })
  meta: Meta;
}
