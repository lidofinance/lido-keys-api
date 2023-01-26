import { ApiProperty } from '@nestjs/swagger';
import { Key } from 'http/common/entities/';

export class RegistryKey extends Key {
  @ApiProperty({
    description: 'Key index in contract',
  })
  index!: number;
}
