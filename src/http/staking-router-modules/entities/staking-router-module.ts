import { ApiProperty } from '@nestjs/swagger';

export enum StakingRouterModuleType {
  CURATED = 'Curated',
  COMMUNITY = 'Community',
  DVT = 'DVT',
}

export class StakingRouterModule {
  // @ApiProperty({
  //   required: true,
  //   description: 'Type of storing keys by module',
  //   enum: ModuleKeyStoreType,
  // })
  // type: StakingRouterModuleKeyStoreType;

  @ApiProperty({
    required: true,
    description: 'Type of Staking Router module',
    enum: StakingRouterModuleType,
  })
  type: StakingRouterModuleType;

  @ApiProperty({
    required: true,
    description: 'Staking Router Module description',
  })
  description: string;

  @ApiProperty({
    required: true,
    description: 'Staking Router Module contract address',
  })
  address: string;
}
