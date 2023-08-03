import { Injectable, Inject, InternalServerErrorException, NotFoundException, LoggerService } from '@nestjs/common';
import { ConfigService } from 'common/config';
import {
  ExitValidatorListResponse,
  ExitValidator,
  ExitPresignMessageListResponse,
  ExitPresignMessage,
  ValidatorsQuery,
} from './entities';
import { CLBlockSnapshot, ModuleId } from 'http/common/entities/';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { Validator } from '@lido-nestjs/validators-registry';
import { ValidatorsService } from 'validators';
import { StakingRouterService } from 'staking-router-modules/staking-router.service';

const VALIDATORS_REGISTRY_DISABLED_ERROR = 'Validators Registry is disabled. Check environment variables';

@Injectable()
export class SRModulesValidatorsService {
  constructor(
    protected readonly configService: ConfigService,
    // protected readonly curatedService: CuratedModuleService,
    protected readonly validatorsService: ValidatorsService,
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected stakingRouterService: StakingRouterService,
  ) {}

  async getOldestLidoValidators(
    moduleId: ModuleId,
    operatorId: number,
    filters: ValidatorsQuery,
  ): Promise<ExitValidatorListResponse> {
    if (this.disabledRegistry()) {
      this.logger.warn('ValidatorsRegistry is disabled in API');
      throw new InternalServerErrorException(VALIDATORS_REGISTRY_DISABLED_ERROR);
    }

    const { validators, clBlockSnapshot } = await this.stakingRouterService.getOperatorOldestValidators(
      moduleId,
      operatorId,
      filters,
    );
    const data = this.createExitValidatorList(validators);

    return {
      data,
      meta: {
        clBlockSnapshot,
      },
    };
  }

  async getVoluntaryExitMessages(
    moduleId: ModuleId,
    operatorId: number,
    filters: ValidatorsQuery,
  ): Promise<ExitPresignMessageListResponse> {
    if (this.disabledRegistry()) {
      this.logger.warn('ValidatorsRegistry is disabled in API');
      throw new InternalServerErrorException(VALIDATORS_REGISTRY_DISABLED_ERROR);
    }

    const { validators, clBlockSnapshot } = await this.stakingRouterService.getOperatorOldestValidators(
      moduleId,
      operatorId,
      filters,
    );
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

  private disabledRegistry() {
    return !this.configService.get('VALIDATOR_REGISTRY_ENABLE');
  }
}
