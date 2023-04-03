import { ApiProperty } from '@nestjs/swagger';
import { CLMeta } from 'http/common/entities';
import { ExitPresignMessage } from './exits-presign-message';

export class ExitPresignMessageListResponse {
  @ApiProperty({
    required: true,
    description: 'Voluntary exit message list',
    type: () => [ExitPresignMessage],
  })
  data!: ExitPresignMessage[];

  @ApiProperty({
    required: true,
    description: 'Meta for voluntary exit endpoints',
    nullable: true,
    type: () => CLMeta,
  })
  meta!: CLMeta;
}
