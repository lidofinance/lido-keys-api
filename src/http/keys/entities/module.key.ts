import { ApiProperty } from '@nestjs/swagger';
import { GeneralKey } from 'http/common/entities/';

export class KeyWithModuleAddress extends GeneralKey {
  @ApiProperty({
    required: true,
    description: 'Module address',
  })
  moduleAddress: string;
}
