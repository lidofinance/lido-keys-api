import { ApiProperty } from '@nestjs/swagger';
import { ELBlockSnapshot } from './el-block-snapshot';

export class ELMeta {
  @ApiProperty({
    type: () => ELBlockSnapshot,
    required: true,
    description: 'Execution layer block information',
  })
  elBlockSnapshot!: ELBlockSnapshot;
}
