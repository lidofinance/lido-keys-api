import { ApiProperty } from '@nestjs/swagger';
import { GeneralKey } from 'http/common/entities/';

export class RegistryKey extends GeneralKey {
  @ApiProperty({
    description: 'Key index in contract',
  })
  index: number;
}
