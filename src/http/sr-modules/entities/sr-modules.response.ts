import { ApiProperty } from '@nestjs/swagger';
import { SRModule, ELBlockSnapshot } from 'http/common/entities/';

export class SRModuleListResponse {
  @ApiProperty({
    type: () => [SRModule],
    description: 'List of staking router modules with detailed information',
  })
  data!: SRModule[];

  @ApiProperty({
    type: () => ELBlockSnapshot,
    nullable: true,
    description: 'Execution layer block information',
  })
  elBlockSnapshot!: ELBlockSnapshot | null;
}

export class SRModuleResponse {
  @ApiProperty({
    type: () => SRModule,
    nullable: true,
    description: 'Detailed staking router module information',
  })
  data!: SRModule | null;

  @ApiProperty({
    type: () => ELBlockSnapshot,
    nullable: true,
    description: 'Execution layer block information',
  })
  elBlockSnapshot!: ELBlockSnapshot | null;
}
