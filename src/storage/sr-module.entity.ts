import { Entity, EntityRepositoryType, PrimaryKey, PrimaryKeyType, Property } from '@mikro-orm/core';
import { StakingModule } from '../staking-router-modules/interfaces/staking-module.interface';
import { SRModuleRepository } from './sr-module.repository';

@Entity({ customRepository: () => SRModuleRepository })
export class SrModuleEntity {
  [EntityRepositoryType]?: SRModuleRepository;
  [PrimaryKeyType]?: [number, string];

  constructor(srModule: StakingModule, nonce: number) {
    this.id = srModule.id;
    this.stakingModuleAddress = srModule.stakingModuleAddress;
    this.stakingModuleFee = srModule.stakingModuleFee;
    this.treasuryFee = srModule.treasuryFee;
    this.targetShare = srModule.targetShare;
    this.status = srModule.status;
    this.name = srModule.name;
    this.lastDepositAt = srModule.lastDepositAt;
    this.lastDepositBlock = srModule.lastDepositBlock;
    this.exitedValidatorsCount = srModule.exitedValidatorsCount;
    this.type = srModule.type;
    this.active = srModule.active;
    this.nonce = nonce;
  }

  // TODO: maybe add incr id

  // TODO: change primary key from [id, stakingModuleAddress] to stakingModuleAddress ?

  // TODO: id primary key

  @PrimaryKey()
  // unique id of the staking module
  @Property()
  id: number;

  @PrimaryKey()
  @Property({ length: 42 })
  // address of staking module
  stakingModuleAddress: string;

  // part of the fee taken from staking rewards that goes to the staking module
  @Property()
  stakingModuleFee: number;

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
  type: string;

  // is module active
  @Property()
  active: boolean;

  // nonce value
  @Property()
  nonce: number;
}
