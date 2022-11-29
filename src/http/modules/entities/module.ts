import { ApiProperty } from '@nestjs/swagger';

export enum ModuleType {
  CURATED = 'Curated',
  COMMUNITY = 'Community',
  DVT = 'DVT',
}

export class Module {
  // @ApiProperty({
  //   required: true,
  //   description: 'Type of storing keys by module',
  //   enum: ModuleKeyStoreType,
  // })
  // type: ModuleKeyStoreType;

  @ApiProperty({
    required: true,
    description: 'Type of module',
    enum: ModuleType,
  })
  type: ModuleType;

  @ApiProperty({
    required: true,
    description: 'Module description',
  })
  description: string;

  @ApiProperty({
    required: true,
    description: 'Module contract address',
  })
  address: string;
}
