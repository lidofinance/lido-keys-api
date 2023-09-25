import { ApiProperty } from '@nestjs/swagger';
import { ELMeta, Key } from '../../common/entities';

export class KeyListResponse {
  @ApiProperty({
    type: () => [Key],
    description: 'List of keys for all modules',
  })
  data!: Key[];

  @ApiProperty({
    type: () => ELMeta,
    nullable: true,
    description: 'Meta',
  })
  meta!: ELMeta;
}
