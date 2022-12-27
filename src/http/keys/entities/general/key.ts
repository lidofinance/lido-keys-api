import { ApiProperty } from '@nestjs/swagger';

export class Key {
  @ApiProperty({
    required: true,
    description: 'Public key',
  })
  key: string;

  @ApiProperty({
    required: false,
    description: 'Signing key',
  })
  depositSignature?: string;
}
