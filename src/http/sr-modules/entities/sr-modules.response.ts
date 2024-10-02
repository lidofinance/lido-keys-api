import { ApiProperty } from '@nestjs/swagger';
import { StakingModuleResponse, ELBlockSnapshot } from '../../common/entities/';

export class SRModuleListResponse {
  @ApiProperty({
    type: () => [StakingModuleResponse],
    required: true,
    description: 'List of staking router modules with detailed information',
  })
  data!: StakingModuleResponse[];

  @ApiProperty({
    type: () => ELBlockSnapshot,
    required: true,
    description: 'Execution layer block information',
  })
  elBlockSnapshot!: ELBlockSnapshot;
}

export class SRModuleResponse {
  @ApiProperty({
    type: () => StakingModuleResponse,
    required: true,
    description: 'Detailed staking router module information',
  })
  data!: StakingModuleResponse;

  @ApiProperty({
    type: () => ELBlockSnapshot,
    required: true,
    description: 'Execution layer block information',
  })
  elBlockSnapshot!: ELBlockSnapshot;
}
