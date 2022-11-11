import { ApiProperty } from '@nestjs/swagger';

export class Key {
  @ApiProperty({
    required: true,
  })
  key: string;

  @ApiProperty({
    required: false,
  })
  depositSignature?: string;
}
