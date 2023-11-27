import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayMinSize, IsString } from 'class-validator';

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
