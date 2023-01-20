import { ApiProperty } from '@nestjs/swagger';

export class CLBlockSnapshot {
  @ApiProperty({
    required: true,
    description: 'Current epoch',
  })
  epoch: number;

  @ApiProperty({
    required: true,
    description: 'Slot root',
  })
  root: string;
  @ApiProperty({
    required: true,
    description: 'Slot value',
  })
  slot: number;
  @ApiProperty({
    required: true,
    description: 'Block number',
  })
  blockNumber: number;
  @ApiProperty({
    required: true,
    description: 'Block timestamp',
  })
  timestamp: number;
  @ApiProperty({
    required: true,
    description: 'Block hash',
  })
  blockHash: string;
}
