import { ApiProperty } from '@nestjs/swagger';
import { RegistryOperator } from 'common/registry';

// TODO: when we get from storage this number of fields  we get a narrowed operator
// maybe move to staking-module-service and here use in response type
export class Operator {
  constructor(operator: RegistryOperator) {
    this.index = operator.index;
    this.active = operator.active;
  }

  @ApiProperty({
    description: 'Index of Operator',
  })
  index: number;

  @ApiProperty({
    description: 'This value shows if node operator active',
  })
  active: boolean;
}
