import { QueryOrder } from '@mikro-orm/core';
import { FilterQuery, FindOptions } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import { StakingModule } from 'staking-router-modules/interfaces';
import { SRModuleEntity } from './sr-module.entity';
import { SRModuleRepository } from './sr-module.repository';

@Injectable()
export class SRModuleStorageService {
  constructor(private readonly repository: SRModuleRepository) {}

  /** find module */
  async find<P extends string = never>(
    where: FilterQuery<SRModuleEntity>,
    options?: FindOptions<SRModuleEntity, P>,
  ): Promise<SRModuleEntity[]> {
    return await this.repository.find(where, options);
  }

  /** find key by index */
  async findOneById(moduleId: number): Promise<SRModuleEntity | null> {
    return await this.repository.findOne({ id: moduleId });
  }

  async findOneByContractAddress(contractAddress: string): Promise<SRModuleEntity | null> {
    return await this.repository.findOne({ stakingModuleAddress: contractAddress });
  }

  /** find all keys */
  async findAll(): Promise<SRModuleEntity[]> {
    return await this.repository.findAll({
      orderBy: [{ id: QueryOrder.ASC }],
    });
  }

  async store(module: StakingModule, currNonce: number): Promise<void> {
    const srModule = new SRModuleEntity(module, currNonce);
    // TODO: what exactly will happen during attempt to write in db module that already exists in db
    await this.repository
      .createQueryBuilder()
      .insert(srModule)
      .onConflict(['id', 'staking_module_address'])
      .merge()
      .execute();
  }
}
