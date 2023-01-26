import { ApiProperty } from '@nestjs/swagger';
import { SRModuleKeysMeta } from './meta';
import { GeneralKey, SRModule } from 'http/common/entities/';

export class GeneralKeyListWithModule {
  @ApiProperty({
    description: 'Keys of staking router module',
    type: () => [GeneralKey],
  })
  keys: GeneralKey[];

  @ApiProperty({
    description: 'Detailed Staking Router information',
    type: () => SRModule,
  })
  module: SRModule;
}

export class GroupedByModuleKeyListResponse {
  @ApiProperty({
    description: 'Keys for all modules grouped by staking router module',
    type: () => [GeneralKeyListWithModule],
  })
  data: GeneralKeyListWithModule[];

  @ApiProperty({
    type: () => SRModuleKeysMeta,
  })
  meta: SRModuleKeysMeta;
}
