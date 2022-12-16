import { ApiProperty } from '@nestjs/swagger';
import { Meta } from './meta';
import { Key } from './key';

export class KeysResponse {
  @ApiProperty({
    type: () => [Key],
  })
  data: Key[];

  @ApiProperty({
    type: () => Meta,
  })
  meta: Meta;
}
