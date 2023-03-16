import { ApiProperty } from '@nestjs/swagger';
import { ELMeta } from 'http/common/response-entities/meta';
import { OperatorListAndSRModule } from './sr-module-operators.response';

export class GroupedByModuleOperatorListResponse {
  @ApiProperty({
    description: 'Operators for all modules grouped by staking router module',
    type: () => [OperatorListAndSRModule],
  })
  data!: OperatorListAndSRModule[];

  @ApiProperty({
    nullable: true,
    type: () => ELMeta,
  })
  meta!: ELMeta | null;
}
