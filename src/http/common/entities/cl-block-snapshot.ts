import { ApiProperty } from '@nestjs/swagger';
import { ConsensusMeta } from '@lido-nestjs/validators-registry';

/**
 * Consensus layer slot the validators of a response were read at, together with the execution layer block the state of
 * that slot holds.
 *
 * Up to Fulu a beacon block carries its own execution payload, so the two always belonged to the same slot. Since the
 * Glamsterdam fork (EIP-7732) the block only commits to a bid and the builder reveals the payload later in the slot, so
 * the payload is applied to the state while the next block is being processed. The state of `slot` therefore holds the
 * payload of an earlier slot, named by `payloadSlot`, and the execution layer fields below describe that one.
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
      'Since the Glamsterdam fork (EIP-7732) it can be the same as in the snapshot before it, because a slot does not ' +
      'always add an execution layer block: that happens at the first slot of the fork, and every time a builder does ' +
      'not reveal its payload in time. Tell snapshots apart by `slot`, which always moves forward.',
  })
  blockNumber: number;

  @ApiProperty({
    required: true,
    description:
      'Timestamp of the execution layer block. ' +
      'Since the Glamsterdam fork (EIP-7732) this is the time of `payloadSlot` and not of `slot`, so it is at least ' +
      'one slot behind. Take the time of `slot` from the slot number itself when that is what is needed.',
  })
  timestamp: number;

  @ApiProperty({
    required: true,
    description:
      'Hash of the execution layer block the state of `slot` holds. ' +
      'Like `blockNumber`, it can be the same as in the snapshot before it since the Glamsterdam fork (EIP-7732).',
  })
  blockHash: string;

  @ApiProperty({
    required: false,
    description:
      'Slot whose execution payload `blockNumber`, `blockHash` and `timestamp` describe. ' +
      'Not set before the Glamsterdam fork (EIP-7732), where a block carries its own payload and the payload slot is ' +
      'always `slot` itself. Since the fork it is normally the parent slot, and it goes further back when the builder ' +
      'of the parent did not reveal its payload in time, or when slots before `slot` were missed.',
  })
  payloadSlot?: number;
}
