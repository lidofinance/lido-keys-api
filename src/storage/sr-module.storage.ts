import { Injectable } from '@nestjs/common';
import { StakingModule } from '../staking-router-modules/interfaces/staking-module.interface';
import { SrModuleEntity } from './sr-module.entity';
import { SRModuleRepository } from './sr-module.repository';

@Injectable()
export class SRModuleStorageService {
  constructor(private readonly repository: SRModuleRepository) {}

  /** find key by index */
  async findOneById(moduleId: number): Promise<SrModuleEntity | null> {
    return await this.repository.findOne({ moduleId });
  }

  async findOneByContractAddress(contractAddress: string): Promise<SrModuleEntity | null> {
    return await this.repository.findOne({ stakingModuleAddress: contractAddress });
  }

  /** find all keys */
  async findAll(): Promise<SrModuleEntity[]> {
    return await this.repository.findAll();
  }

  async upsert(srModule: StakingModule, nonce: number, lastChangedBlockHash: string): Promise<void> {
    // Try to find an existing entity by moduleId or stakingModuleAddress
    let existingModule = await this.repository.findOne({
      moduleId: srModule.moduleId,
    });

    if (!existingModule) {
      // If the entity doesn't exist, create a new one
      existingModule = new SrModuleEntity(
        { ...srModule, stakingModuleAddress: srModule.stakingModuleAddress.toLowerCase() },
        nonce,
        lastChangedBlockHash,
      );
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
      existingModule.active = srModule.active;
      existingModule.nonce = nonce;
      existingModule.lastChangedBlockHash = lastChangedBlockHash;
    }

    // Save the entity (either a new one or an updated one)
    await this.repository.persistAndFlush(existingModule);
  }

  /** removes all modules */
  async removeAll() {
    return await this.repository.nativeDelete({});
  }
}
