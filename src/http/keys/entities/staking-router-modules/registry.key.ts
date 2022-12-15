import { ApiProperty } from '@nestjs/swagger';

export class RegistryKey {
  @ApiProperty({
    required: true,
  })
  key: string;

  @ApiProperty({
    required: false,
  })
  depositSignature?: string;

  @ApiProperty({
    required: false,
  })
  index?: number;

  @ApiProperty({
    required: false,
  })
  operatorIndex?: number;

  @ApiProperty({
    required: false,
  })
  used?: boolean;
}
