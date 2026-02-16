import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class ValidatorsQuery {
  @ApiProperty({
    required: false,
    description: 'Number of validators to exit. If validators number less than amount, return all validators.',
  })
  @Transform(({ value }) => (value === '' ? undefined : Number(value)))
  @IsInt()
  @Min(0)
  @IsOptional()
  max_amount?: number;

  @ApiProperty({
    required: false,
    description: 'Percent of validators to exit. Default value is 10. Percent has a higher priority than max_amount',
  })
  @Transform(({ value }) => (value === '' ? undefined : Number(value)))
  @IsInt()
  @Min(0)
  @IsOptional()
  percent?: number;
}
