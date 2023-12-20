import { ApiProperty } from '@nestjs/swagger';
import { ElMetaEntity } from '../../../storage/el-meta.entity';

export class ELBlockSnapshot implements ElMetaEntity {
  constructor(meta: ElMetaEntity) {
    this.blockNumber = meta.blockNumber;
    this.blockHash = meta.blockHash;
    this.timestamp = meta.timestamp;
    this.lastChangedBlockHash = meta.lastChangedBlockHash;
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

  @ApiProperty({
    required: true,
    description: 'Last changed block hash — used to determine that a change has been made to this block',
  })
  lastChangedBlockHash: string;
}
