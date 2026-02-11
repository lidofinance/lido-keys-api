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
    // this.withdrawalCredentialsType = stakingModule.withdrawalCredentialsType;
    this.lastChangedBlockHash = stakingModule.lastChangedBlockHash;
  }

  @ApiProperty({
    required: true,
    description:
      "Counter that MUST change value if keys were added, removed, node operator was activated/deactivated, a node operator's ready to deposit keys count is changed",
  })
  nonce: number;

  @ApiProperty({
    required: true,
    description: 'Type of module',
  })
  type: string; //STAKING_MODULE_TYPE;

  @ApiProperty({
    required: true,
    description: 'Unique id of the module',
  })
  id: number;

  @ApiProperty({
    required: true,
    description: 'Address of module',
  })
  stakingModuleAddress: string;

  @ApiProperty({
    required: true,
    description: 'Reward fee of the module',
  })
  moduleFee: number;

  @ApiProperty({
    required: true,
    description: 'Treasury fee',
  })
  treasuryFee: number;

  @ApiProperty({
    required: true,
    description: 'Target percent of total keys in protocol, in BP',
  })
  targetShare: number;

  @ApiProperty({
    required: true,
    description:
      'Module status if module can not accept the deposits or can participate in further reward distribution',
  })
  status: number;

  @ApiProperty({
    required: true,
    description: 'Name of module',
  })
  name: string;

  @ApiProperty({
    required: true,
    description: 'block.timestamp of the last deposit of the module',
  })
  lastDepositAt: number;

  @ApiProperty({
    required: true,
    description: 'block.number of the last deposit of the module',
  })
  lastDepositBlock: number;

  @ApiProperty({
    required: true,
    description: 'Exited validators count',
  })
  exitedValidatorsCount: number;

  @ApiProperty({
    required: true,
    description: 'Module activation status',
  })
  active: boolean;

  @ApiProperty({
    required: true,
    description: 'Last changed block hash — used to determine that a change has been made to this staking module',
  })
  lastChangedBlockHash: string;

  // @ApiProperty({
  //   required: true,
  //   description:
  //     'Withdrawal credentials type: 1 (0x01 legacy withdrawal credentials) or 2 (compounding withdrawal credentials type)',
  //   enum: [1, 2],
  // })
  // withdrawalCredentialsType: number;
}
