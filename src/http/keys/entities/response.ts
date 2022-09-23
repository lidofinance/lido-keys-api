import { ApiProperty } from '@nestjs/swagger';
import { Meta } from './meta';
import { Key } from './key';

export class AllKeysResponse {
  @ApiProperty({
    type: () => [Key],
  })
  data: Key[];

  @ApiProperty({
    type: () => Meta,
  })
  meta: Meta;
}

export class KeyResponse {
  @ApiProperty({
    type: () => Key,
  })
  data: Key;

  @ApiProperty({
    type: () => Meta,
  })
  meta: Meta;
}
