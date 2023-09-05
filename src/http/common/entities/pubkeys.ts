import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayMinSize, IsString } from 'class-validator';

// TODO: put put it with key query at the same file
export class KeysFindBody {
  @ApiProperty({
    required: true,
    description: 'Public keys list',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  pubkeys!: string[];
}
