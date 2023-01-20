import { ApiProperty } from '@nestjs/swagger';

export class ExitPresignMessage {
  @ApiProperty({
    required: true,
    description: 'Index of validator.',
  })
  validatorIndex: number;

  @ApiProperty({
    required: true,
    description: 'Finalized epoch.',
  })
  epoch: number;
}
