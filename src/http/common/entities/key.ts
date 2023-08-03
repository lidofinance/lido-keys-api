import { ApiProperty } from '@nestjs/swagger';
import { SRModuleKey } from './sr-module-key';

// TODO: when we get from storage this number of fields  we get a narrowed key
// maybe move to staking-module-service and here use in response type
export class Key {
  constructor(key: SRModuleKey) {
    this.key = key.key;
    this.depositSignature = key.depositSignature;
    this.operatorIndex = key.operatorIndex;
    this.used = key.used;
  }

  @ApiProperty({
    required: true,
    description: 'Public key',
  })
  key: string;

  @ApiProperty({
    required: true,
    description: 'Signing key',
  })
  depositSignature: string;

  @ApiProperty({
    required: true,
    description: 'Operator index',
  })
  operatorIndex: number;

  @ApiProperty({
    required: true,
    description: 'Used key status',
  })
  used: boolean;
}
