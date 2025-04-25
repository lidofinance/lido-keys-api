import { ApiProperty } from '@nestjs/swagger';

export class ExitValidator {
  @ApiProperty({
    required: true,
    description: 'Index of validator',
  })
  validatorIndex!: number;

  @ApiProperty({
    required: true,
    description: 'Public key',
  })
  key!: string;
}
