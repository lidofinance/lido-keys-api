import { ApiProperty } from '@nestjs/swagger';

export class ModuleMeta {
  @ApiProperty({ description: "Staking router module's address" })
  moduleAddress: string;
  @ApiProperty({
    description: 'Blockchain block number',
  })
  blockNumber: number;
  @ApiProperty({
    description: 'Blockchain block hash',
  })
  blockHash: string;
}
