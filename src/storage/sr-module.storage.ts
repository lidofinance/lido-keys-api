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
    return await this.repository.findOne({ id: moduleId });
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

  async store(module: StakingModule, currNonce: number): Promise<void> {
    const srModule = new SrModuleEntity(module, currNonce);
    // TODO: what exactly will happen during attempt to write in db module that already exists in db
    await this.repository
      .createQueryBuilder()
      .insert(srModule)
      .onConflict(['id', 'staking_module_address'])
      .merge()
      .execute();
  }

  /** removes all modules */
  async removeAll() {
    return await this.repository.nativeDelete({});
  }
}
