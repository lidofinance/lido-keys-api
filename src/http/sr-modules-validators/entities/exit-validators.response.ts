import { ApiProperty } from '@nestjs/swagger';
import { ExitValidator } from './exit-validator';
import { ValidatorsMeta } from './meta';

export class ExitValidatorListResponse {
  @ApiProperty({
    required: true,
    description: 'N oldest validators for current epoch when voluntary exit can be processed',
    type: () => [ExitValidator],
  })
  data: ExitValidator[];

  @ApiProperty({
    required: true,
    description: 'Meta for voluntary exit enpoints',
    type: () => ValidatorsMeta,
  })
  meta: ValidatorsMeta;
}
