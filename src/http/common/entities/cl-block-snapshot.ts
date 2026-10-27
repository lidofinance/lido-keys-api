import { ApiProperty } from '@nestjs/swagger';
import { ConsensusMeta } from '@lido-nestjs/validators-registry';

/**
 * Consensus layer slot the validators of a response were read at, together with the execution layer block the state of
 * that slot holds. After the Glamsterdam fork, the state of `slot` holds the payload of an earlier slot, named by
 * `payloadSlot`, and the execution layer fields below describe that one.
 */
export class CLBlockSnapshot {
  constructor(clMeta: ConsensusMeta) {
    this.epoch = clMeta.epoch;
    this.root = clMeta.slotStateRoot;
    this.slot = clMeta.slot;
    this.blockNumber = clMeta.blockNumber;
    this.timestamp = clMeta.timestamp;
    this.blockHash = clMeta.blockHash;
    this.payloadSlot = clMeta.payloadSlot;
  }

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
    description:
      'Number of the execution layer block the state of `slot` holds. ' +
      'It can be the same as in the snapshot before it. Tell snapshots apart by `slot`, which always moves forward.',
  })
  blockNumber: number;

  @ApiProperty({
    required: true,
    description:
      'Timestamp of the execution layer block. Since the Glamsterdam fork this is the time of `payloadSlot` and not ' +
      'of `slot`. Take the time of `slot` from the slot number itself when that is what is needed.',
  })
  timestamp: number;

  @ApiProperty({
    required: true,
    description: 'Hash of the execution layer block with `blockNumber`',
  })
  blockHash: string;

  @ApiProperty({
    required: false,
    description:
      'Slot whose execution payload `blockNumber`, `blockHash` and `timestamp` describe. ' +
      'Not set before the Glamsterdam fork.',
  })
  payloadSlot?: number;
}
