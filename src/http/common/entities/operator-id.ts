import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDefined, IsInt, Min } from 'class-validator';

export class OperatorId {
  @Transform(({ value }) => (value === '' ? undefined : Number(value)))
  @ApiProperty({
    name: 'operator_id',
    description: 'Operator index',
  })
  @IsDefined()
  @IsInt()
  @Min(0)
  operator_id!: number;
}
