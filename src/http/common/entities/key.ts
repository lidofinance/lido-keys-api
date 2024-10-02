import { ApiProperty } from '@nestjs/swagger';
import { RegistryKey } from '../../../common/registry';
import { addressToChecksum } from '../utils';

// maybe Partial<RegistryKey> in future
export class Key implements RegistryKey {
  constructor(key: RegistryKey) {
    this.key = key.key;
    this.depositSignature = key.depositSignature;
    this.operatorIndex = key.operatorIndex;
    this.used = key.used;
    this.moduleAddress = addressToChecksum(key.moduleAddress);
    this.index = key.index;
    this.vetted = key.vetted;
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

  @ApiProperty({
    required: true,
    description: 'Vetted key status',
  })
  vetted: boolean;
}
