import { ApiProperty } from '@nestjs/swagger';

export class StakingRouterModuleMeta {
  @ApiProperty({ description: "Staking router module's address" })
  moduleAddress: string;

  @ApiProperty({
    description: 'Block number',
  })
  blockNumber: number;

  @ApiProperty({
    description: 'Block hash',
  })
  blockHash: string;

  @ApiProperty({
    description: 'Block timestamp',
  })
  timestamp: number;

  @ApiProperty({ description: 'Staking Router module keys operation index. ' })
  keysOpIndex: number;
}
