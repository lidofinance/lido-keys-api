import { ApiProperty } from '@nestjs/swagger';
import { ELMeta, Key } from '../../common/entities';

export class KeyListResponse {
  @ApiProperty({
    type: () => [Key],
    description: 'List of keys with general fields for all modules and SR module address',
  })
  data!: Key[];

  @ApiProperty({
    type: () => ELMeta,
    nullable: true,
    description: 'Meta for keys endpoints',
  })
  meta!: ELMeta;
}
