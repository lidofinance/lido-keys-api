import { ApiProperty } from '@nestjs/swagger';

export class ExitPresignMessage {
  @ApiProperty({
    required: true,
    description: 'Index of validator',
  })
  validator_index!: string;

  @ApiProperty({
    required: true,
    description: 'Finalized epoch',
  })
  epoch!: string;
}
