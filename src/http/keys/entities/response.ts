import { ApiProperty } from '@nestjs/swagger';
import { Meta } from './meta';
import { KeyWithModuleAddress } from './module.key';

export class KeyListResponse {
  @ApiProperty({
    type: () => [KeyWithModuleAddress],
    description: 'List of keys with general fields for all modules and SR module address',
  })
  data: KeyWithModuleAddress[];

  @ApiProperty({
    type: () => Meta,
  })
  meta: Meta;
}
