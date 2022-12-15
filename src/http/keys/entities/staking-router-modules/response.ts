import { ApiProperty, getSchemaPath, ApiExtraModels } from '@nestjs/swagger';
import { StakingRouterModuleMeta } from './meta';
import { RegistryKey } from './registry.key';

type StakingRouterModuleKey = RegistryKey;

@ApiExtraModels(RegistryKey)
export class StakingRouterModuleKeysResponse {
  @ApiProperty({
    type: 'array',
    items: { oneOf: [{ $ref: getSchemaPath(RegistryKey) }] },
  })
  data: StakingRouterModuleKey[];

  @ApiProperty({
    type: () => StakingRouterModuleMeta,
  })
  meta: StakingRouterModuleMeta;
}
