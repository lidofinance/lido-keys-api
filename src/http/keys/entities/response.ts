import { ApiProperty } from '@nestjs/swagger';
import { KeyWithModuleAddress } from './key-with-module-address';
import { ELMeta } from 'http/common/entities';

export class KeyListResponse {
  @ApiProperty({
    type: () => [KeyWithModuleAddress],
    description: 'List of keys with general fields for all modules and SR module address',
  })
  data!: KeyWithModuleAddress[];

  @ApiProperty({
    type: () => ELMeta,
    nullable: true,
    description: 'Meta for keys endpoints',
  })
  meta!: ELMeta | null;
}
