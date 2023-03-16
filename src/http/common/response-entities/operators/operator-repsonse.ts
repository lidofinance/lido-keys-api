import { ApiProperty } from '@nestjs/swagger';
import { OperatorEntity } from 'staking-router-modules';

export class OperatorResponse {
  constructor(operator: OperatorEntity) {
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
