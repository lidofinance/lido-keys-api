import { ApiProperty } from '@nestjs/swagger';
import { ConsensusMeta } from '@lido-nestjs/validators-registry';

export class CLBlockSnapshot {
  constructor(clMeta: ConsensusMeta) {
    this.epoch = clMeta.epoch;
    this.root = clMeta.slotStateRoot;
    this.slot = clMeta.slot;
    this.blockNumber = clMeta.blockNumber;
    this.timestamp = clMeta.timestamp;
    this.blockHash = clMeta.blockHash;
  }

  @ApiProperty({
    required: true,
    description: 'Current epoch',
  })
  epoch!: number;

  @ApiProperty({
    required: true,
    description: 'Slot root',
  })
  root!: string;

  @ApiProperty({
    required: true,
    description: 'Slot value',
  })
  slot!: number;

  @ApiProperty({
    required: true,
    description: 'Block number',
  })
  blockNumber!: number;

  @ApiProperty({
    required: true,
    description: 'Block timestamp',
  })
  timestamp!: number;

  @ApiProperty({
    required: true,
    description: 'Block hash',
  })
  blockHash!: string;
}
