import { ApiProperty } from '@nestjs/swagger';
import { CLBlockSnapshot, ELBlockSnapshot } from 'http/common/entities';

export class Status {
  @ApiProperty({
    required: true,
    description: 'App version',
  })
  appVersion!: string;

  @ApiProperty({
    required: true,
    description: 'Chain id',
  })
  chainId!: number;

  @ApiProperty({
    type: () => ELBlockSnapshot,
    nullable: true,
    description: 'Execution layer block information',
  })
  elBlockSnapshot!: ELBlockSnapshot | null;

  @ApiProperty({
    type: () => CLBlockSnapshot,
    nullable: true,
    description: 'Consensus layer block information',
  })
  clBlockSnapshot!: CLBlockSnapshot | null;
}
