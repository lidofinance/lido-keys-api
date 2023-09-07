import { ApiProperty } from '@nestjs/swagger';
// import { SRModuleKey } from './sr-module-key';
import { RegistryKey } from 'common/registry';

// maybe Partial<RegistryKey> in future
export class Key implements RegistryKey {
  constructor(key: RegistryKey) {
    this.key = key.key;
    this.depositSignature = key.depositSignature;
    this.operatorIndex = key.operatorIndex;
    this.used = key.used;
    this.moduleAddress = key.moduleAddress;
    this.index = key.index;
  }

  @ApiProperty({
    required: true,
    description: 'Key index',
  })
  index: number;

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

  @ApiProperty({
    required: true,
    description: 'Module address',
  })
  moduleAddress: string;
}
