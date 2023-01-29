import { Injectable, Inject, InternalServerErrorException, NotFoundException, LoggerService } from '@nestjs/common';
import { ConfigService, GROUPED_ONCHAIN_V1_TYPE } from 'common/config';
import {
  ExitValidatorListResponse,
  ExitValidator,
  ExitPresignMessageListResponse,
  ExitPresignMessage,
  Query as ValidatorsQuery,
} from './entities';
import { CLBlockSnapshot, ModuleId } from 'http/common/entities/';
import { ValidatorsRegistryService } from 'jobs/validators-registry.service';
import { getSRModule } from 'http/common/sr-modules.utils';
import { RegistryService } from 'jobs/registry.service';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { VALIDATORS_STATUSES_FOR_EXIT, DEFAULT_EXIT_PERCENT } from './constants';
import { ConsensusMeta, Validator } from '@lido-nestjs/validators-registry';

@Injectable()
export class SRModulesValidatorsService {
  constructor(
    protected readonly configService: ConfigService,
    protected readonly registryService: RegistryService,
    protected readonly validatorsRegistryService: ValidatorsRegistryService,
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
  ) {}

  async getOldestLidoValidators(
    moduleId: ModuleId,
    operatorId: number,
    filters: ValidatorsQuery,
  ): Promise<ExitValidatorListResponse> {
    // At first, we should find module by id in our list, in future without chainId
    const chainId = this.configService.get('CHAIN_ID');
    const module = getSRModule(moduleId, chainId);

    if (!module) {
      throw new NotFoundException(`Module with moduleId ${moduleId} is not supported`);
    }
    // We supppose if module in list, Keys API knows how to work with it
    // it is also important to have consistent module info and meta

    if (module.type === GROUPED_ONCHAIN_V1_TYPE) {
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
    // At first, we should find module by id in our list, in future without chainId
    const chainId = this.configService.get('CHAIN_ID');
    const module = getSRModule(moduleId, chainId);

    if (!module) {
      throw new NotFoundException(`Module with moduleId ${moduleId} is not supported`);
    }
    // We supppose if module in list, Keys API knows how to work with it
    // it is also important to have consistent module info and meta

    if (module.type === GROUPED_ONCHAIN_V1_TYPE) {
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
    const { keys, meta: elMeta } = await this.registryService.getKeysWithMeta({
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

    const { validators, meta: clMeta } = await this.validatorsRegistryService.getOldestValidators({
      pubkeys,
      statuses: VALIDATORS_STATUSES_FOR_EXIT,
      max_amount: filters?.max_amount,
      percent: percent,
    });

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
      this.logger.warn(`Last Execution Layer block number in our database older than last Consensus Layer`);
      // add metric or alert on breaking el > cl condition
      // TODO: what answer will be better here?
      throw new InternalServerErrorException();
    }

    return { validators, meta: clMeta };
  }

  private createExitValidatorList(validators: Validator[]): ExitValidator[] {
    return validators.map((v) => ({ validatorIndex: v.index, key: v.pubkey }));
  }

  private createExitPresignMessageList(validators: Validator[], clMeta: ConsensusMeta): ExitPresignMessage[] {
    return validators.map((v) => ({ validatorIndex: v.index, epoch: clMeta.epoch }));
  }
}
