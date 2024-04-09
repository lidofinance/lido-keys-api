import { Injectable, Inject, InternalServerErrorException, LoggerService } from '@nestjs/common';
import { ConfigService } from '../../common/config';
import {
  ExitValidatorListResponse,
  ExitValidator,
  ExitPresignMessageListResponse,
  ExitPresignMessage,
  ValidatorsQuery,
} from './entities';
import { CLBlockSnapshot, ELBlockSnapshot } from '../common/entities/';
import { LOGGER_PROVIDER } from '@catalist-nestjs/logger';
import { Validator } from '@catalist-nestjs/validators-registry';
import { ValidatorsService } from '../../validators';
import { StakingRouterService } from '../../staking-router-modules/staking-router.service';
import { EntityManager } from '@mikro-orm/knex';
import {
  DEFAULT_EXIT_PERCENT,
  VALIDATORS_STATUSES_FOR_EXIT,
  VALIDATORS_REGISTRY_DISABLED_ERROR,
} from '../../validators/validators.constants';
import { httpExceptionTooEarlyResp } from '../common/entities/http-exceptions';
import { IsolationLevel } from '@mikro-orm/core';
import { SrModuleEntity } from 'storage/sr-module.entity';

@Injectable()
export class SRModulesValidatorsService {
  constructor(
    protected readonly configService: ConfigService,
    protected readonly validatorsService: ValidatorsService,
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected stakingRouterService: StakingRouterService,
    protected readonly entityManager: EntityManager,
  ) {}

  async getOldestLidoValidators(
    moduleId: string | number,
    operatorId: number,
    filters: ValidatorsQuery,
  ): Promise<ExitValidatorListResponse> {
    if (this.isRegistryDisabled()) {
      this.logger.warn('ValidatorsRegistry is disabled in API');
      throw new InternalServerErrorException(VALIDATORS_REGISTRY_DISABLED_ERROR);
    }

    const { validators, clBlockSnapshot } = await this.getOperatorOldestValidators(moduleId, operatorId, filters);
    const data = this.createExitValidatorList(validators);

    return {
      data,
      meta: {
        clBlockSnapshot,
      },
    };
  }

  async getVoluntaryExitMessages(
    moduleId: string | number,
    operatorId: number,
    filters: ValidatorsQuery,
  ): Promise<ExitPresignMessageListResponse> {
    if (this.isRegistryDisabled()) {
      this.logger.warn('ValidatorsRegistry is disabled in API');
      throw new InternalServerErrorException(VALIDATORS_REGISTRY_DISABLED_ERROR);
    }

    const { validators, clBlockSnapshot } = await this.getOperatorOldestValidators(moduleId, operatorId, filters);
    const data = this.createExitPresignMessageList(validators, clBlockSnapshot);

    return {
      data,
      meta: {
        clBlockSnapshot: clBlockSnapshot,
      },
    };
  }

  private createExitValidatorList(validators: Validator[]): ExitValidator[] {
    return validators.map((v) => ({ validatorIndex: v.index, key: v.pubkey }));
  }

  private createExitPresignMessageList(validators: Validator[], clMeta: CLBlockSnapshot): ExitPresignMessage[] {
    return validators.map((v) => ({ validator_index: String(v.index), epoch: String(clMeta.epoch) }));
  }

  private isRegistryDisabled() {
    return !this.configService.get('VALIDATOR_REGISTRY_ENABLE');
  }

  private async getOperatorOldestValidators(
    moduleId: string | number,
    operatorIndex: number,
    filters: ValidatorsQuery,
  ): Promise<{ validators: Validator[]; clBlockSnapshot: CLBlockSnapshot }> {
    const { validators, meta } = await this.entityManager.transactional(
      async () => {
        const { module, elBlockSnapshot }: { module: SrModuleEntity; elBlockSnapshot: ELBlockSnapshot } =
          await this.stakingRouterService.getStakingModuleAndMeta(moduleId);

        // read from config name of module that implement functions to fetch and store keys for type
        // TODO: check what will happen if implementation is not a provider of StakingRouterModule
        const moduleInstance = this.stakingRouterService.getStakingRouterModuleImpl(module.type);
        const keys = await moduleInstance.getKeys(module.stakingModuleAddress, { operatorIndex });

        const pubkeys = keys.map((pubkey) => pubkey.key);
        const percent =
          filters?.max_amount == undefined && filters?.percent == undefined ? DEFAULT_EXIT_PERCENT : filters?.percent;

        const result = await this.validatorsService.getOldestValidators({
          pubkeys,
          statuses: VALIDATORS_STATUSES_FOR_EXIT,
          max_amount: filters?.max_amount,
          percent: percent,
        });

        if (!result) {
          // if result of this method is null it means Validators Registry is disabled
          throw new InternalServerErrorException(VALIDATORS_REGISTRY_DISABLED_ERROR);
        }

        const { validators, meta: clMeta } = result;

        // check if clMeta is not null
        // if it is null, it means keys db is empty and Updating Validators Job is not finished yet
        if (!clMeta) {
          this.logger.warn(`CL meta is empty, maybe first Updating Validators Job is not finished yet.`);
          throw httpExceptionTooEarlyResp();
        }

        // We need EL meta always be actual
        if (elBlockSnapshot.blockNumber < clMeta.blockNumber) {
          this.logger.warn(
            'The Execution Layer node is behind the Consensus Layer node, check that the EL node is synced and running.',
          );
          // TODO: add metric or alert on breaking el > cl condition
          throw new InternalServerErrorException(
            'The Execution Layer node is behind the Consensus Layer node, check that the EL node is synced and running.',
          );
        }

        return { validators, meta: clMeta };
      },
      { isolationLevel: IsolationLevel.REPEATABLE_READ },
    );

    return { validators, clBlockSnapshot: new CLBlockSnapshot(meta) };
  }
}
