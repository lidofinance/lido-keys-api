import { ApiProperty } from '@nestjs/swagger';
import { CLMeta } from '../../common/entities';
import { ExitPresignMessage } from './exits-presign-message';

export class ExitPresignMessageListResponse {
  @ApiProperty({
    type: () => [ExitPresignMessage],
    required: true,
    description: 'Voluntary exit message list',
  })
  data!: ExitPresignMessage[];

  @ApiProperty({
    type: () => CLMeta,
    required: true,
    description: 'Meta for voluntary exit endpoints',
  })
  meta!: CLMeta;
}
