import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayMinSize } from 'class-validator';
import { IsPubkey } from 'common/decorators/isPubkey';

export class KeysFindBody {
  @ApiProperty({
    required: true,
    description: 'Public keys list',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsPubkey({ each: true })
  pubkeys!: string[];
}
