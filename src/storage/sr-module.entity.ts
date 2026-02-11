import { Entity, EntityRepositoryType, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import { StakingModule } from '../staking-router-modules/interfaces/staking-module.interface';
import { MODULE_ADDRESS_LEN } from './constants';
import { SRModuleRepository } from './sr-module.repository';

@Entity({ customRepository: () => SRModuleRepository })
export class SrModuleEntity implements StakingModule {
  [EntityRepositoryType]?: SRModuleRepository;

  constructor(srModule: StakingModule, nonce: number, lastChangedBlockHash: string) {
    this.moduleId = srModule.moduleId;
    this.stakingModuleAddress = srModule.stakingModuleAddress;
    this.moduleFee = srModule.moduleFee;
    this.treasuryFee = srModule.treasuryFee;
    this.targetShare = srModule.targetShare;
    this.status = srModule.status;
    this.name = srModule.name;
    this.lastDepositAt = srModule.lastDepositAt;
    this.lastDepositBlock = srModule.lastDepositBlock;
    this.exitedValidatorsCount = srModule.exitedValidatorsCount;
    this.type = srModule.type;
    this.active = srModule.active;
    // this.withdrawalCredentialsType = srModule.withdrawalCredentialsType;
    this.nonce = nonce;
    this.lastChangedBlockHash = lastChangedBlockHash;
  }

  @PrimaryKey()
  // autoincrement primary key
  id!: number;

  // unique id of the staking module
  @Unique()
  @Property()
  moduleId: number;

  @Unique()
  @Property({ length: MODULE_ADDRESS_LEN })
  // address of staking module
  stakingModuleAddress: string;

  // part of the fee taken from staking rewards that goes to the staking module
  @Property()
  moduleFee: number;

  // part of the fee taken from staking rewards that goes to the treasury
  @Property()
  treasuryFee: number;

  // target percent of total validators in protocol, in BP
  @Property()
  targetShare: number;

  // staking module status if staking module can not accept the deposits or can participate in further reward distribution
  @Property()
  status: number;

  // name of staking module
  @Property()
  name: string;

  // block.timestamp of the last deposit of the staking module
  @Property()
  lastDepositAt: number;

  // block.number of the last deposit of the staking module
  @Property()
  lastDepositBlock: number;

  // number of exited validators
  @Property()
  exitedValidatorsCount: number;

  // type of staking router module
  //TODO: use here enum
  @Property()
  type: string; //STAKING_MODULE_TYPE;

  // is module active
  @Property()
  active: boolean;

  // nonce value
  @Property()
  nonce: number;

  // last changed block hash
  @Property()
  lastChangedBlockHash: string;

  // // Withdrawal credentials type: 1 (0x01 legacy withdrawal credentials) or 2 (compounding withdrawal credentials type)
  // @Property()
  // withdrawalCredentialsType: number;
}
