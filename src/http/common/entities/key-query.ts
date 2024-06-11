import { BadRequestException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsBoolean, IsOptional, Min } from 'class-validator';

const toBoolean = (value, propertyName: string): boolean => {
  if (value === 'true') {
    return true;
  }

  if (value == 'false') {
    return false;
  }

  throw new BadRequestException([`${propertyName.toLocaleLowerCase()} must be a boolean value`]);
};

// TODO: use it in staking-module-service
export class KeyQuery {
  @ApiProperty({
    required: false,
    description:
      'Filter to get used keys. Possible values: true/false. If this value is not specified endpoint will return all keys.',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toBoolean(value, 'used'))
  used?: boolean;

  @ApiProperty({
    required: false,
    description:
      'Filter for operator with specified index. If this value is not specified endpoint will return keys for all operators.',
  })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  operatorIndex?: number;
}

export class KeyQueryWithAddress extends KeyQuery {
  @ApiProperty({ isArray: true, type: String, required: false, description: 'Module address list' })
  @Transform(({ value }) => (Array.isArray(value) ? value : Array(value)))
  @Transform(({ value }) => value.map((v) => v.toLowerCase()))
  @IsOptional()
  moduleAddresses!: string[];
}
