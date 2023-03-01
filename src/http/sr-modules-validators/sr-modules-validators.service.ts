import { Injectable, Inject, InternalServerErrorException, NotFoundException, LoggerService } from '@nestjs/common';
import { ConfigService } from 'common/config';
import {
  ExitValidatorListResponse,
  ExitValidator,
  ExitPresignMessageListResponse,
  ExitPresignMessage,
  Query as ValidatorsQuery,
} from './entities';
import { CLBlockSnapshot, ModuleId } from 'http/common/entities/';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { VALIDATORS_STATUSES_FOR_EXIT, DEFAULT_EXIT_PERCENT } from './constants';
import { ConsensusMeta, Validator } from '@lido-nestjs/validators-registry';
import { CuratedModuleService, STAKING_MODULE_TYPE } from 'staking-router-modules';
import { ValidatorsService } from 'validators';
import { KeysUpdateService } from 'jobs/keys-update';

const VALIDATORS_REGISRY_DISABLED_ERROR = 'Validators Registry is disabled. Check environment variables';

@Injectable()
export class SRModulesValidatorsService {
  constructor(
    protected readonly configService: ConfigService,
    protected readonly curatedService: CuratedModuleService,
    protected readonly validatorsService: ValidatorsService,
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected keysUpdateService: KeysUpdateService,
  ) {}

  async getOldestLidoValidators(
    moduleId: ModuleId,
    operatorId: number,
    filters: ValidatorsQuery,
  ): Promise<ExitValidatorListResponse> {
    if (this.disabledRegistry()) {
      this.logger.warn('ValidatorsRegistry is disabled in API');
      throw new InternalServerErrorException(VALIDATORS_REGISRY_DISABLED_ERROR);
    }

    const stakingModule = await this.keysUpdateService.getStakingModule(moduleId);

    if (!stakingModule) {
      throw new NotFoundException(`Module with moduleId ${moduleId} is not supported`);
    }

    // We suppose if module in list, Keys API knows how to work with it
    // it is also important to have consistent module info and meta

    if (stakingModule.type === STAKING_MODULE_TYPE.CURATED_ONCHAIN_V1_TYPE) {
      const { validators, meta: clMeta } = await this.getOperatorOldestValidators(operatorId, filters);

      if (!clMeta) {
        return {
          data: [],
          meta: null,
        };
      }

      const data = this.createExitValidatorList(validators);
      const clBlockSnapshot = new CLBlockSnapshot(clMeta);

      return {
        data,
        meta: {
          clBlockSnapshot: clBlockSnapshot,
        },
      };
    }

    throw new NotFoundException(`Modules with other types are not supported`);
  }

  async getVoluntaryExitMessages(
    moduleId: ModuleId,
    operatorId: number,
    filters: ValidatorsQuery,
  ): Promise<ExitPresignMessageListResponse> {
    if (this.disabledRegistry()) {
      this.logger.warn('ValidatorsRegistry is disabled in API');
      throw new InternalServerErrorException(VALIDATORS_REGISRY_DISABLED_ERROR);
    }

    const stakingModule = await this.keysUpdateService.getStakingModule(moduleId);

    if (!stakingModule) {
      throw new NotFoundException(`Module with moduleId ${moduleId} is not supported`);
    }

    // We suppose if module in list, Keys API knows how to work with it
    // it is also important to have consistent module info and meta

    if (stakingModule.type === STAKING_MODULE_TYPE.CURATED_ONCHAIN_V1_TYPE) {
      const { validators, meta: clMeta } = await this.getOperatorOldestValidators(operatorId, filters);

      if (!clMeta) {
        return {
          data: [],
          meta: null,
        };
      }

      const data = this.createExitPresignMessageList(validators, clMeta);
      const clBlockSnapshot = new CLBlockSnapshot(clMeta);

      return {
        data,
        meta: {
          clBlockSnapshot: clBlockSnapshot,
        },
      };
    }

    throw new NotFoundException(`Modules with other types are not supported`);
  }

  private async getOperatorOldestValidators(
    operatorId: number,
    filters: ValidatorsQuery,
  ): Promise<{ validators: Validator[]; meta: ConsensusMeta | null }> {
    // get used keys for operator
    const { keys, meta: elMeta } = await this.curatedService.getKeysWithMeta({
      used: true,
      operatorIndex: operatorId,
    });

    // check if elMeta is not null
    // if it is null, it means keys db is empty and Updating Keys Job is not finished yet
    if (!elMeta) {
      this.logger.warn(`EL meta is empty, maybe first Updating Keys Job is not finished yet.`);

      return {
        validators: [],
        meta: null,
      };
    }

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
      throw new InternalServerErrorException(VALIDATORS_REGISRY_DISABLED_ERROR);
    }

    const { validators, meta: clMeta } = result;

    // check if clMeta is not null
    // if it is null, it means keys db is empty and Updating Validators Job is not finished yet
    if (!clMeta) {
      this.logger.warn(`CL meta is empty, maybe first Updating Validators Job is not finished yet.`);

      return {
        validators: [],
        meta: null,
      };
    }

    // We need EL meta always be actual
    if (elMeta.blockNumber < clMeta.blockNumber) {
      this.logger.warn('Last Execution Layer block number in our database older than last Consensus Layer');
      // add metric or alert on breaking el > cl condition
      // TODO: what answer will be better here?
      throw new InternalServerErrorException(
        'Last Execution Layer block number in our database older than last Consensus Layer',
      );
    }

    return { validators, meta: clMeta };
  }

  private createExitValidatorList(validators: Validator[]): ExitValidator[] {
    return validators.map((v) => ({ validatorIndex: v.index, key: v.pubkey }));
  }

  private createExitPresignMessageList(validators: Validator[], clMeta: ConsensusMeta): ExitPresignMessage[] {
    return validators.map((v) => ({ validatorIndex: v.index, epoch: clMeta.epoch }));
  }

  private disabledRegistry() {
    return !this.configService.get('VALIDATOR_REGISTRY_ENABLE');
  }
}
