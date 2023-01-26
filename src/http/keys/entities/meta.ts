import { ApiProperty } from '@nestjs/swagger';
import { ELBlockSnapshot } from 'http/common/entities/el-block-snapshot';

export class KeysMeta {
  @ApiProperty({
    type: () => ELBlockSnapshot,
    description: 'Execution layer block information',
  })
  elBlockSnapshot!: ELBlockSnapshot;
}
