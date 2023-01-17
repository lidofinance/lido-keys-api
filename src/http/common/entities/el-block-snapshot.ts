import { ApiProperty } from '@nestjs/swagger';

export class ELBlockSnapshot {
  @ApiProperty({
    required: true,
    description: 'Block number',
  })
  blockNumber: number;

  @ApiProperty({
    required: true,
    description: 'Block hash',
  })
  blockHash: string;

  @ApiProperty({
    required: true,
    description: 'Block timestamp',
  })
  timestamp: number;
}
