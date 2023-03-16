import { ApiProperty } from '@nestjs/swagger';
import { Key } from './key';
import { RegistryKey } from '@lido-nestjs/registry';

export class CuratedKey extends Key {
  constructor(key: RegistryKey) {
    super(key);
    this.index = key.index;
  }

  @ApiProperty({
    description: 'Key index in contract',
  })
  index: number;
}
