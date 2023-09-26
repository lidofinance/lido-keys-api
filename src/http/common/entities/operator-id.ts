import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class OperatorId {
  @ApiProperty({
    name: 'operator_id',
    description: 'Operator index',
  })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  operator_id!: number;
}
