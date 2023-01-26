import { ApiProperty } from '@nestjs/swagger';

export class Key {
  @ApiProperty({
    required: true,
    description: 'Public key',
  })
  key: string;

  @ApiProperty({
    required: true,
    description: 'Signing key',
  })
  depositSignature: string;

  @ApiProperty({
    required: true,
    description: 'Operator index',
  })
  operatorIndex: number;

  @ApiProperty({
    required: true,
    description: 'Used key status',
  })
  used: boolean;
}
