import { ApiProperty } from '@nestjs/swagger';
import { ExitPresignMessage } from './exits-presign-message';
import { ValidatorsMeta } from './meta';

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
    type: () => ValidatorsMeta,
  })
  meta!: ValidatorsMeta | null;
}
