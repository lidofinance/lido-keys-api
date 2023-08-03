import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayNotEmpty, ArrayMinSize, IsString } from 'class-validator';

// TODO: put put it with key query at the same file
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
