import { ApiProperty } from '@nestjs/swagger';

export class Query {
  @ApiProperty({
    required: false,
    description: 'Number of validators to exit. If validators number less than amount, return all validators.',
  })
  max_amount?: number;

  @ApiProperty({
    required: false,
    description: 'Percent of validators to exit. Default value is 10.',
  })
  percent?: number;
}
