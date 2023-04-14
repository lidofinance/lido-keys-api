import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayNotEmpty, ArrayMinSize, IsString } from 'class-validator';

export class KeysFindBody {
  @ApiProperty({
    required: true,
    description: 'Public keys list',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @IsString({ each: true })
  pubkeys!: string[];
}
