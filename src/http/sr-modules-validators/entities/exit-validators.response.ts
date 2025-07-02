import { ApiProperty } from '@nestjs/swagger';
import { CLMeta } from '../../common/entities';
import { ExitValidator } from './exit-validator';

export class ExitValidatorListResponse {
  @ApiProperty({
    type: () => [ExitValidator],
    required: true,
    description: 'N oldest validators for current epoch when voluntary exit can be processed',
  })
  data!: ExitValidator[];

  @ApiProperty({
    type: () => CLMeta,
    required: true,
    description: 'Meta for voluntary exit endpoints',
  })
  meta!: CLMeta;
}
