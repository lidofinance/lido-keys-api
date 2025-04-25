import { CLBlockSnapshot } from './cl-block-snapshot';
import { ApiProperty } from '@nestjs/swagger';

export class CLMeta {
  @ApiProperty({
    type: () => CLBlockSnapshot,
    required: true,
    description: 'Consensus layer block information',
  })
  clBlockSnapshot!: CLBlockSnapshot;
}
