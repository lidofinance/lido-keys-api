import { ApiProperty } from '@nestjs/swagger';
import { KeysMeta } from './meta';
import { KeyWithModuleAddress } from './module-key';

export class KeyListResponse {
  @ApiProperty({
    type: () => [KeyWithModuleAddress],
    description: 'List of keys with general fields for all modules and SR module address',
  })
  data!: KeyWithModuleAddress[];

  @ApiProperty({
    type: () => KeysMeta,
    nullable: true,
    description: 'Meta for keys endpoints',
  })
  meta!: KeysMeta | null;
}
