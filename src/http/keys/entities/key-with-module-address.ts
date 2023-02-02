import { ApiProperty } from '@nestjs/swagger';
import { Key } from 'http/common/entities/';

import { RegistryKey } from '@lido-nestjs/registry';

export class KeyWithModuleAddress extends Key {
  constructor(key: RegistryKey, moduleAddress: string) {
    super(key);
    this.moduleAddress = moduleAddress;
  }

  @ApiProperty({
    required: true,
    description: 'Module address',
  })
  moduleAddress: string;
}
