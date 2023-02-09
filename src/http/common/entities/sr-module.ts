import { ApiProperty } from '@nestjs/swagger';
import { StakingRouterModule } from 'common/config';

export class SRModule {
  constructor(nonce: number, module: StakingRouterModule) {
    this.nonce = nonce;
    this.type = module.type;
    this.id = module.id;
    this.stakingModuleAddress = module.stakingModuleAddress;
    this.moduleFee = module?.moduleFee ?? null;
    this.treasuryFee = module?.treasuryFee ?? null;
    this.targetShare = module?.targetShare ?? null;
    this.status = module?.status ?? null;
    this.name = module.name;
    this.lastDepositAt = module?.lastDepositAt ?? null;
    this.lastDepositBlock = module?.lastDepositBlock ?? null;
  }

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
    nullable: true,
  })
  stakingModuleAddress: string;

  @ApiProperty({
    description: 'rewarf fee of the module',
    nullable: true,
  })
  moduleFee: number | null;

  @ApiProperty({
    description: 'treasury fee',
    nullable: true,
  })
  treasuryFee: number | null;

  @ApiProperty({
    description: 'target percent of total keys in protocol, in BP',
    nullable: true,
  })
  targetShare: number | null;

  @ApiProperty({
    description:
      'module status if module can not accept the deposits or can participate in further reward distribution',
    nullable: true,
  })
  status: number | null;

  @ApiProperty({
    description: 'name of module',
  })
  name: string;

  @ApiProperty({
    description: 'block.timestamp of the last deposit of the module',
    nullable: true,
  })
  lastDepositAt: number | null;

  @ApiProperty({
    description: 'block.number of the last deposit of the module',
    nullable: true,
  })
  lastDepositBlock: number | null;
}
