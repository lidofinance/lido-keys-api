import { QueryOrder } from '@mikro-orm/core';
import { FilterQuery, FindOptions } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import { ConfigService } from 'common/config';
import { addTimeoutToStream } from '../utils/stream.utils';
import { RegistryOperator } from './operator.entity';
import { RegistryOperatorRepository } from './operator.repository';
import { DEFAULT_STREAM_TIMEOUT, STREAM_OPERATORS_TIMEOUT_MESSAGE } from './constants';

@Injectable()
export class RegistryOperatorStorageService {
  constructor(private readonly repository: RegistryOperatorRepository, private readonly configService: ConfigService) {}

  /** find operators */
  async find<P extends string = never>(
    where: FilterQuery<RegistryOperator>,
    options?: FindOptions<RegistryOperator, P>,
  ): Promise<RegistryOperator[]> {
    return await this.repository.find(where, options);
  }

  findAsStream(where: FilterQuery<RegistryOperator>, fields?: string[]): AsyncIterable<RegistryOperator> {
    const qb = this.repository.createQueryBuilder();

    qb.select(fields || '*')
      .where(where)
      .orderBy({ module_address: 'asc', index: 'asc' });

    const knex = qb.getKnexQuery();
    const stream = knex.stream();

    const streamTimeout = this.configService.get('STREAM_TIMEOUT') ?? DEFAULT_STREAM_TIMEOUT;
    addTimeoutToStream(stream, streamTimeout, STREAM_OPERATORS_TIMEOUT_MESSAGE);

    return stream;
  }

  /** find all operators */
  async findAll(moduleAddress: string): Promise<RegistryOperator[]> {
    return await this.repository.find(
      { moduleAddress },
      {
        orderBy: [{ index: QueryOrder.ASC }],
      },
    );
  }

  /** find operator by index */
  async findOneByIndex(moduleAddress: string, operatorIndex: number): Promise<RegistryOperator | null> {
    return await this.repository.findOne({ moduleAddress, index: operatorIndex });
  }

  /** removes operator by index */
  async removeOneByIndex(moduleAddress: string, operatorIndex: number) {
    return await this.repository.nativeDelete({ moduleAddress, index: operatorIndex });
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
