import { ApiProperty } from '@nestjs/swagger';
import { CLBlockSnapshot, ELBlockSnapshot } from 'http/common/response-entities';

export class Status {
  @ApiProperty({
    description: 'App version',
  })
  appVersion!: string;

  @ApiProperty({
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
    description: 'Consensus layer block information',
  })
  clBlockSnapshot!: CLBlockSnapshot | null;
}
