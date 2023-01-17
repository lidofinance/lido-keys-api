import { ApiProperty } from '@nestjs/swagger';
import { SRModule, ELBlockSnapshot } from 'http/common/entities/';

export class SRModuleListResponse {
  @ApiProperty({
    type: () => [SRModule],
    description: 'List of staking router modules with detailed information',
  })
  data: SRModule[];

  @ApiProperty({
    type: () => ELBlockSnapshot,
    description: 'Execution layer block information',
  })
  elBlockSnapshot: ELBlockSnapshot;
}

export class SRModuleResponse {
  @ApiProperty({
    type: () => SRModule,
    description: 'Detailed staking router module information',
  })
  data: SRModule;

  @ApiProperty({
    type: () => ELBlockSnapshot,
    description: 'Execution layer block information',
  })
  elBlockSnapshot: ELBlockSnapshot;
}
