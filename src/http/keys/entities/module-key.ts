import { ApiProperty } from '@nestjs/swagger';
import { Key } from 'http/common/entities/';

export class KeyWithModuleAddress extends Key {
  @ApiProperty({
    required: true,
    description: 'Module address',
  })
  moduleAddress: string;
}
