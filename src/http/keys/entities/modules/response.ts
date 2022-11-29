import { ApiProperty, getSchemaPath, ApiExtraModels } from '@nestjs/swagger';
import { ModuleMeta } from './meta';
import { RegistryKey } from './registry.key';

type ModuleKey = RegistryKey;

@ApiExtraModels(RegistryKey)
export class ModuleKeysResponse {
  @ApiProperty({
    type: 'array',
    items: { oneOf: [{ $ref: getSchemaPath(RegistryKey) }] },
  })
  data: ModuleKey[];

  @ApiProperty({
    type: () => ModuleMeta,
  })
  meta: ModuleMeta;
}
