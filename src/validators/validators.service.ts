import { Inject, Injectable } from '@nestjs/common';
import {
  ValidatorsRegistryInterface,
  ConsensusValidatorsAndMetadata,
  Validator,
  ConsensusMeta,
} from '@lido-nestjs/validators-registry';
import { LOGGER_PROVIDER, LoggerService } from 'common/logger';
import { ConfigService } from 'common/config';
import { QueryOrder } from '@mikro-orm/core';

export interface ValidatorsFilter {
  pubkeys: string[];
  statuses: string[];
  max_amount: number | undefined;
  percent: number | undefined;
}

@Injectable()
export class ValidatorsService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected readonly validatorsRegistry: ValidatorsRegistryInterface,
    protected readonly configService: ConfigService,
  ) {}
  // TODO: is - for bool
  public disabledRegistry() {
    return !this.configService.get('VALIDATOR_REGISTRY_ENABLE');
  }

  public async updateValidators(blockId): Promise<ConsensusMeta | null> {
    if (this.disabledRegistry()) {
      this.logger.warn('ValidatorsRegistry is disabled in API');
      return null;
    }

    return await this.validatorsRegistry.update(blockId);
  }

  /**
   *
   * @param filter Filters to get from validators database keys.
   * Return oldest validators and meta.
   * null if ValidatorsRegistry is disabled
   */
  public async getOldestValidators(filter: ValidatorsFilter): Promise<ConsensusValidatorsAndMetadata | null> {
    if (this.disabledRegistry()) {
      this.logger.warn('ValidatorsRegistry is disabled in API');
      return null;
    }
    // we suppose in this function at least percent is set
    // should we move setting a default percent in this function ?
    const where = {
      status: { $in: filter.statuses },
    };

    const options = {
      orderBy: { index: QueryOrder.ASC },
    };

    const { validators, meta } = await this.validatorsRegistry.getValidators(filter.pubkeys, where, options);

    // the lower the index, the older the validator
    // if percent is provided, we will get percent oldest validators from db
    if (filter.percent) {
      return { validators: this.getPercentOfValidators(validators, filter.percent), meta };
    }

    if (filter.max_amount) {
      const nextValidatorsToExit = validators.slice(0, filter.max_amount);
      return { validators: nextValidatorsToExit, meta };
    }

    // TODO: if percent is 0 and max_amount is set, what should we use ?
    // or if we took percent 5 of 9 validators, validators amount will be 0
    // what should we return ?

    return { validators, meta };
  }

  public async getMetaDataFromStorage(): Promise<ConsensusMeta | null> {
    if (this.disabledRegistry()) {
      this.logger.warn('ValidatorsRegistry is disabled in API');
      return null;
    }

    return this.validatorsRegistry.getMeta();
  }

  private getPercentOfValidators(validators: Validator[], percent: number): Validator[] {
    // Does this round method suit to us?
    // TODO: return at least 1 validator
    const amount = Math.round((validators.length * percent) / 100);
    return validators.slice(0, amount);
  }
}
