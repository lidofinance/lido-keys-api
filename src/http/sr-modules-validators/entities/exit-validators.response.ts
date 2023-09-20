import { ApiProperty } from '@nestjs/swagger';
import { CLMeta } from '../../common/entities';
import { ExitValidator } from './exit-validator';

export class ExitValidatorListResponse {
  @ApiProperty({
    required: true,
    description: 'N oldest validators for current epoch when voluntary exit can be processed',
    type: () => [ExitValidator],
  })
  data!: ExitValidator[];

  @ApiProperty({
    nullable: true,
    description: 'Meta for voluntary exit endpoints',
    type: () => CLMeta,
  })
  meta!: CLMeta;
}
