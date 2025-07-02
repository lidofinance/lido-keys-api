import { ApiProperty } from '@nestjs/swagger';
import { ELMeta } from '../../common/entities/';
import { OperatorListAndSRModule } from './sr-module-operators.response';

export class GroupedByModuleOperatorListResponse {
  @ApiProperty({
    type: () => [OperatorListAndSRModule],
    required: true,
    description: 'Operators for all modules grouped by staking router module',
  })
  data!: OperatorListAndSRModule[];

  @ApiProperty({
    type: () => ELMeta,
    required: true,
    description: 'Meta',
  })
  meta!: ELMeta;
}
