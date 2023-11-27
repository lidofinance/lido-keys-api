import { ApiProperty } from '@nestjs/swagger';
import { SrModuleEntity } from 'storage/sr-module.entity';
import { addressToChecksum } from '../utils';

export class StakingModuleResponse implements Omit<SrModuleEntity, 'id' | 'moduleId'> {
  constructor(stakingModule: SrModuleEntity) {
    this.nonce = stakingModule.nonce;
    this.type = stakingModule.type;
    this.id = stakingModule.moduleId;
    this.stakingModuleAddress = addressToChecksum(stakingModule.stakingModuleAddress);
    this.moduleFee = stakingModule.moduleFee;
    this.treasuryFee = stakingModule.treasuryFee;
    this.targetShare = stakingModule.targetShare;
    this.status = stakingModule.status;
    this.name = stakingModule.name;
    this.lastDepositAt = stakingModule.lastDepositAt;
    this.lastDepositBlock = stakingModule.lastDepositBlock;
    this.exitedValidatorsCount = stakingModule.exitedValidatorsCount;
    this.active = stakingModule.active;
  }

  @ApiProperty({
    description:
      "Counter that MUST change value if keys were added, removed, node operator was activated/deactivated,  a node operator's ready to deposit keys count is changed",
  })
  nonce: number;

  @ApiProperty({
    description: 'Type of module',
  })
  type: string; //STAKING_MODULE_TYPE;

  @ApiProperty({
    description: 'Unique id of the module',
  })
  id: number;

  @ApiProperty({
    description: 'Address of module',
  })
  stakingModuleAddress: string;

  @ApiProperty({
    description: 'Reward fee of the module',
  })
  moduleFee: number;

  @ApiProperty({
    description: 'Treasury fee',
  })
  treasuryFee: number;

  @ApiProperty({
    description: 'Target percent of total keys in protocol, in BP',
  })
  targetShare: number;

  @ApiProperty({
    description:
      'Module status if module can not accept the deposits or can participate in further reward distribution',
  })
  status: number;

  @ApiProperty({
    description: 'Name of module',
  })
  name: string;

  @ApiProperty({
    description: 'block.timestamp of the last deposit of the module',
  })
  lastDepositAt: number;

  @ApiProperty({
    description: 'block.number of the last deposit of the module',
    nullable: true,
  })
  lastDepositBlock: number;

  @ApiProperty({
    description: 'Exited validators count',
  })
  exitedValidatorsCount: number;

  @ApiProperty({
    description: 'Module activation status',
  })
  active: boolean;
}
