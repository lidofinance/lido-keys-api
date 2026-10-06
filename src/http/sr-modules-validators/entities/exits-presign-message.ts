import { ApiProperty } from '@nestjs/swagger';

export class ExitPresignMessage {
  @ApiProperty({
    required: true,
    description: 'Index of validator',
  })
  validator_index!: string;

  @ApiProperty({
    required: true,
    description: 'Finalized epoch of the consensus slot the validators were read at.',
  })
  epoch!: string;
}
