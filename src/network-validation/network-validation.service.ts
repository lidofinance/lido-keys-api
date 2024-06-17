import { MikroORM, UseRequestContext } from '@mikro-orm/core';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { LidoLocator, LIDO_LOCATOR_CONTRACT_TOKEN } from '@lido-nestjs/contracts';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { REGISTRY_CONTRACT_ADDRESSES } from '@lido-nestjs/contracts';
import { ConfigService } from '../common/config';
import { ConsensusProviderService } from '../common/consensus-provider';
import { ExecutionProviderService } from '../common/execution-provider';
import { RegistryKeyStorageService, RegistryOperatorStorageService } from '../common/registry';
import { SRModuleStorageService } from '../storage/sr-module.storage';
import { AppInfoStorageService } from '../storage/app-info.storage';

export enum InconsistentDataInDBErrorTypes {
  appInfoMismatch = 'APP_INFO_TABLE_DATA_MISMATCH_ERROR',
  emptyModule = 'EMPTY_MODULE_TABLE_ERROR',
  curatedModuleAddressMismatch = 'CURATED_MODULE_ADDRESS_MISMATCH',
}

export class ChainMismatchError extends Error {
  configChainId: number;
  elChainId: number;
  clChainId: number | undefined;

  constructor(message: string, configChainId: number, elChainId: number, clChainId?: number | undefined) {
    super(message);
    this.configChainId = configChainId;
    this.elChainId = elChainId;
    this.clChainId = clChainId;
  }
}

export class InconsistentDataInDBError extends Error {
  type: InconsistentDataInDBErrorTypes;

  constructor(message: string, type: InconsistentDataInDBErrorTypes) {
    super(message);
    this.type = type;
  }
}

@Injectable()
export class NetworkValidationService {
  constructor(
    protected readonly orm: MikroORM,
    @Inject(LIDO_LOCATOR_CONTRACT_TOKEN) protected readonly contract: LidoLocator,
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected readonly configService: ConfigService,
    protected readonly consensusProviderService: ConsensusProviderService,
    protected readonly executionProviderService: ExecutionProviderService,
    protected readonly keyStorageService: RegistryKeyStorageService,
    protected readonly moduleStorageService: SRModuleStorageService,
    protected readonly operatorStorageService: RegistryOperatorStorageService,
    protected readonly appInfoStorageService: AppInfoStorageService,
  ) {}

  @UseRequestContext()
  public async validate(): Promise<void> {
    const configChainId = this.configService.get('CHAIN_ID');
    const elChainId = await this.executionProviderService.getChainId();

    await this.checkChainIdMismatch(configChainId, elChainId);

    const [dbKey, dbCuratedModule, dbOperator] = await Promise.all([
      await this.keyStorageService.find({}, { limit: 1 }),
      await this.moduleStorageService.findOneByModuleId(1),
      await this.operatorStorageService.find({}, { limit: 1 }),
    ]);

    if (dbKey.length === 0 && dbCuratedModule == null && dbOperator.length === 0) {
      this.logger.log('DB is empty, write chain info into DB');
      return await this.appInfoStorageService.update({
        chainId: configChainId,
        locatorAddress: this.contract.address,
      });
    }

    const appInfo = await this.appInfoStorageService.get();

    if (appInfo != null) {
      if (appInfo.chainId !== configChainId || appInfo.locatorAddress !== this.contract.address) {
        throw new InconsistentDataInDBError(
          `Chain configuration mismatch. Database is not empty and contains information for chain ${appInfo.chainId} and locator address ${appInfo.locatorAddress}, but the service is trying to start for chain ${configChainId} and locator address ${this.contract.address}`,
          InconsistentDataInDBErrorTypes.appInfoMismatch,
        );
      }

      return;
    }

    if (dbCuratedModule == null) {
      throw new InconsistentDataInDBError(
        'Inconsistent data in database. Some DB tables are empty, but some are not.',
        InconsistentDataInDBErrorTypes.emptyModule,
      );
    }

    if (dbCuratedModule.stakingModuleAddress !== REGISTRY_CONTRACT_ADDRESSES[configChainId].toLowerCase()) {
      throw new InconsistentDataInDBError(
        `Chain configuration mismatch. Service is trying to start for chain ${configChainId}, but DB contains data for another chain.`,
        InconsistentDataInDBErrorTypes.curatedModuleAddressMismatch,
      );
    }

    this.logger.log('DB is not empty and chain info is not found in DB, write chain info into DB');
    await this.appInfoStorageService.update({
      chainId: configChainId,
      locatorAddress: this.contract.address,
    });
  }

  private async checkChainIdMismatch(configChainId: number, elChainId: number): Promise<void> {
    if (configChainId !== elChainId) {
      throw new ChainMismatchError("Chain ID in the config doesn't match EL chain ID", configChainId, elChainId);
    }

    if (this.configService.get('VALIDATOR_REGISTRY_ENABLE')) {
      const depositContract = await this.consensusProviderService.getDepositContract();
      const clChainId = Number(depositContract.data?.chain_id);

      if (elChainId !== clChainId) {
        throw new ChainMismatchError(
          'Execution and consensus chain IDs do not match',
          configChainId,
          elChainId,
          clChainId,
        );
      }
    }
  }
}
