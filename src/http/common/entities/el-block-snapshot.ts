import { ApiProperty } from '@nestjs/swagger';
import { SRModuleMeta } from './sr-module-meta';

export class ELBlockSnapshot {
  constructor(meta: SRModuleMeta) {
    this.blockNumber = meta.blockNumber;
    this.blockHash = meta.blockHash;
    this.timestamp = meta.timestamp;
  }

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
