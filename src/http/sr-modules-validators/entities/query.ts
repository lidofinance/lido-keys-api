import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class Query {
  @Transform(({ value }) => Number(value))
  @ApiProperty({
    required: false,
    description: 'Number of validators to exit. If validators number less than amount, return all validators.',
  })
  max_amount?: number;

  @Transform(({ value }) => Number(value))
  @ApiProperty({
    required: false,
    description: 'Percent of validators to exit. Default value is 10.',
  })
  percent?: number;
}
