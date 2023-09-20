import { QueryOrder } from '@mikro-orm/core';
import { FilterQuery, FindOptions } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import { StakingModule } from '../staking-router-modules/interfaces/staking-module.interface';
import { SrModuleEntity } from './sr-module.entity';
import { SRModuleRepository } from './sr-module.repository';

@Injectable()
export class SRModuleStorageService {
  constructor(private readonly repository: SRModuleRepository) {}

  /** find module */
  async find<P extends string = never>(
    where: FilterQuery<SrModuleEntity>,
    options?: FindOptions<SrModuleEntity, P>,
  ): Promise<SrModuleEntity[]> {
    return await this.repository.find(where, options);
  }

  /** find key by index */
  async findOneById(moduleId: number): Promise<SrModuleEntity | null> {
    return await this.repository.findOne({ moduleId });
  }

  async findOneByContractAddress(contractAddress: string): Promise<SrModuleEntity | null> {
    return await this.repository.findOne({ stakingModuleAddress: contractAddress });
  }

  /** find all keys */
  async findAll(): Promise<SrModuleEntity[]> {
    return await this.repository.findAll({
      orderBy: [{ id: QueryOrder.ASC }],
    });
  }

  async upsert(srModule: StakingModule, nonce: number) {
    // Try to find an existing entity by moduleId or stakingModuleAddress
    let existingModule = await this.repository.findOne({
      moduleId: srModule.moduleId,
    });

    srModule.stakingModuleAddress = srModule.stakingModuleAddress.toLowerCase();

    if (!existingModule) {
      // If the entity doesn't exist, create a new one
      existingModule = new SrModuleEntity(srModule, nonce);
    } else {
      // If the entity exists, update its properties
      existingModule.moduleFee = srModule.moduleFee;
      existingModule.treasuryFee = srModule.treasuryFee;
      existingModule.targetShare = srModule.targetShare;
      existingModule.status = srModule.status;
      existingModule.name = srModule.name;
      existingModule.lastDepositAt = srModule.lastDepositAt;
      existingModule.lastDepositBlock = srModule.lastDepositBlock;
      existingModule.exitedValidatorsCount = srModule.exitedValidatorsCount;
      existingModule.type = srModule.type;
      existingModule.active = srModule.active;
      existingModule.nonce = nonce;
    }

    // Save the entity (either a new one or an updated one)
    await this.repository.persistAndFlush(existingModule);

    return existingModule;
  }

  /** removes all modules */
  async removeAll() {
    return await this.repository.nativeDelete({});
  }
}
