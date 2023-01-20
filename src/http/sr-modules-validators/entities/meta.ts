import { ApiProperty } from '@nestjs/swagger';
import { CLBlockSnapshot } from 'http/common/entities/cl-block-snapshot';

export class ValidatorsMeta {
  @ApiProperty({
    type: () => CLBlockSnapshot,
    description: 'Consensus layer block information',
  })
  clBlockSnapshot: CLBlockSnapshot;
}
