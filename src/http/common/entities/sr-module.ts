import { ApiProperty } from '@nestjs/swagger';

export class SRModule {
  @ApiProperty({
    description:
      "Counter that MUST change value if keys were added, removed, node operator was activated/deactivated,  a node operator's ready to deposit keys count is changed",
  })
  nonce: number;
  @ApiProperty({
    description: 'type of module',
  })
  type: string;

  @ApiProperty({
    description: 'unique id of the module',
  })
  id: number;

  @ApiProperty({
    description: 'address of module',
  })
  stakingModuleAddress: string;

  @ApiProperty({
    description: 'rewarf fee of the module',
  })
  moduleFee: number;

  @ApiProperty({
    description: 'treasury fee',
  })
  treasuryFee: number;

  @ApiProperty({
    description: 'target percent of total keys in protocol, in BP',
  })
  targetShare: number;

  @ApiProperty({
    description:
      'module status if module can not accept the deposits or can participate in further reward distribution',
  })
  status: number;

  @ApiProperty({
    description: 'name of module',
  })
  name: string;

  @ApiProperty({
    description: 'block.timestamp of the last deposit of the module',
  })
  lastDepositAt: number;

  @ApiProperty({
    description: 'block.number of the last deposit of the module',
  })
  lastDepositBlock: number;
}
