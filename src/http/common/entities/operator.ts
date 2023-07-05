import { ApiProperty } from '@nestjs/swagger';
import { RegistryOperator } from 'common/registry';

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
