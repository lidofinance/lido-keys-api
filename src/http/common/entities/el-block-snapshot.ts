import { ApiProperty } from '@nestjs/swagger';
import { ElMetaEntity } from '../../../storage/el-meta.entity';

export class ELBlockSnapshot {
  constructor(meta: ElMetaEntity) {
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
