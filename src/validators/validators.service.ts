import { Inject, Injectable } from '@nestjs/common';
import {
  ValidatorsRegistryInterface,
  ConsensusValidatorsAndMetadata,
  Validator,
  ConsensusMeta,
} from '@lido-nestjs/validators-registry';
import { LOGGER_PROVIDER, LoggerService } from '../common/logger';
import { ConfigService } from '../common/config';
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

  public isDisabledRegistry() {
    return !this.configService.get('VALIDATOR_REGISTRY_ENABLE');
  }

  public async updateValidators(blockId): Promise<ConsensusMeta | null> {
    if (this.isDisabledRegistry()) {
      this.logger.warn('ValidatorsRegistry is disabled in API');
      return null;
    }

    return await this.validatorsRegistry.updateStream(blockId);
  }

  /**
   *
   * @param filter Filters to get from validators database keys.
   * Return oldest validators and meta.
   * null if ValidatorsRegistry is disabled
   */
  public async getOldestValidators(filter: ValidatorsFilter): Promise<ConsensusValidatorsAndMetadata | null> {
    if (this.isDisabledRegistry()) {
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

    // return default value in this case is unpredictable. so lets return []
    if (filter.percent == 0) {
      return { validators: [], meta };
    }

    return { validators, meta };
  }

  public async getMetaDataFromStorage(): Promise<ConsensusMeta | null> {
    if (this.isDisabledRegistry()) {
      this.logger.warn('ValidatorsRegistry is disabled in API');
      return null;
    }

    return this.validatorsRegistry.getMeta();
  }

  private getPercentOfValidators(validators: Validator[], percent: number): Validator[] {
    const amount = (validators.length * percent) / 100;
    // or const roundedAmount = amount < 1 ? 1 : Math.round(amount);
    const ceilAmount = Math.ceil(amount);
    return validators.slice(0, ceilAmount);
  }
}
