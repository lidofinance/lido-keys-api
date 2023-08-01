import { QueryOrder } from '@mikro-orm/core';
import { FilterQuery, FindOptions } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import { RegistryOperator } from './operator.entity';
import { RegistryOperatorRepository } from './operator.repository';

@Injectable()
export class RegistryOperatorStorageService {
  constructor(private readonly repository: RegistryOperatorRepository) {}

  async getChunk(limit: number, offset: number, where: FilterQuery<RegistryOperator>, options: any) {
    const query = this.repository.createQueryBuilder().select('*').where(where).limit(limit).offset(offset);
    const chunk = await query.execute();

    return chunk;
  }

  /** find operators */
  async find<P extends string = never>(
    where: FilterQuery<RegistryOperator>,
    options?: FindOptions<RegistryOperator, P>,
  ): Promise<RegistryOperator[]> {
    return await this.repository.find(where, options);
  }

  /** find all operators */
  async findAll(): Promise<RegistryOperator[]> {
    return await this.repository.findAll({
      orderBy: [{ index: QueryOrder.ASC }],
    });
  }

  /** find operator by index */
  async findOneByIndex(operatorIndex: number): Promise<RegistryOperator | null> {
    return await this.repository.findOne({ index: operatorIndex });
  }

  /** removes operator by index */
  async removeOneByIndex(operatorIndex: number) {
    return await this.repository.nativeDelete({ index: operatorIndex });
  }

  /** removes all operators */
  async removeAll() {
    return await this.repository.nativeDelete({});
  }

  /** saves operator to storage */
  async saveOne(operator: RegistryOperator) {
    const key = new RegistryOperator(operator);
    return await this.repository.persistAndFlush(key);
  }

  /** saves multiply operators to storage */
  async save(operators: RegistryOperator[]) {
    const result = await Promise.all(
      operators.map(async (operator) => {
        const instance = new RegistryOperator(operator);
        return await this.repository.persist(instance);
      }),
    );

    await this.repository.flush();
    return result;
  }
}
