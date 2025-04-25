import { ApiProperty } from '@nestjs/swagger';
import { ELMeta, Key } from '../../common/entities';

export class KeyListResponse {
  @ApiProperty({
    type: () => [Key],
    required: true,
    description: 'List of keys for all modules',
  })
  data!: Key[];

  @ApiProperty({
    type: () => ELMeta,
    required: true,
    description: 'Meta',
  })
  meta!: ELMeta;
}
