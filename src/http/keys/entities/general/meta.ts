import { ApiProperty } from '@nestjs/swagger';

export class Meta {
  @ApiProperty({
    description: 'Blockchain block number',
  })
  blockNumber: number;
  @ApiProperty({
    description: 'Blockchain block hash',
  })
  blockHash: string;
}
