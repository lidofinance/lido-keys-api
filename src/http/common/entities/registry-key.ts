import { ApiProperty } from '@nestjs/swagger';
import { Key } from 'http/common/entities/';
import { RegistryKey as LibRegistryKey } from '@lido-nestjs/registry';

export class RegistryKey extends Key {
  constructor(key: LibRegistryKey) {
    super(key);
    this.index = key.index;
  }

  @ApiProperty({
    description: 'Key index in contract',
  })
  index: number;
}
