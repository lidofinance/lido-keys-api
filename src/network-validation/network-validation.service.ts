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
  emptyKeys = 'EMPTY_KEYS_TABLE_ERROR',
  emptyModules = 'EMPTY_MODULES_TABLE_ERROR',
  emptyOperators = 'EMPTY_OPERATORS_TABLE_ERROR',
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
    @Inject(LIDO_LOCATOR_CONTRACT_TOKEN) protected readonly locatorContract: LidoLocator,
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

    const [dbKeys, dbCuratedModule, dbOperators] = await Promise.all([
      await this.keyStorageService.find({}, { limit: 1 }),
      await this.moduleStorageService.findOneByModuleId(1),
      await this.operatorStorageService.find({}, { limit: 1 }),
    ]);

    /**
     * @note If all these 3 tables are empty, it is assumed that the service is run on the clean DB and it is safe to
     * store info about the chain ID for which the service is run to tie information about the chain ID and locator to
     * keys, modules, and operators that will be downloaded and stored into the DB.
     */
    if (dbKeys.length === 0 && dbCuratedModule == null && dbOperators.length === 0) {
      this.logger.log('DB is empty, write chain info into DB');
      return await this.appInfoStorageService.update({
        chainId: configChainId,
        locatorAddress: this.locatorContract.address,
      });
    }

    const appInfo = await this.appInfoStorageService.get();

    if (appInfo != null) {
      /**
       * @note If the app info table has information about the chain and locator, and this information doesn't match the
       * chain specified in the env variables, it indicates that the service was already run and saved to the DB info
       * for one chain, and now it is going to run for another chain. This case is detected here to prevent corruption
       * of data in the DB.
       */
      if (appInfo.chainId !== configChainId || appInfo.locatorAddress !== this.locatorContract.address) {
        throw new InconsistentDataInDBError(
          `Chain configuration mismatch. Database is not empty and contains information for chain ${appInfo.chainId} and locator address ${appInfo.locatorAddress}, but the service is trying to start for chain ${configChainId} and locator address ${this.locatorContract.address}`,
          InconsistentDataInDBErrorTypes.appInfoMismatch,
        );
      }

      return;
    }

    if (dbKeys.length === 0) {
      throw new InconsistentDataInDBError(
        'Inconsistent data in database. Keys table is empty, but other tables are not empty.',
        InconsistentDataInDBErrorTypes.emptyKeys,
      );
    }

    if (dbCuratedModule == null) {
      throw new InconsistentDataInDBError(
        'Inconsistent data in database. Modules table is empty, but other tables are not empty.',
        InconsistentDataInDBErrorTypes.emptyModules,
      );
    }

    if (dbOperators.length === 0) {
      throw new InconsistentDataInDBError(
        'Inconsistent data in database. Operators table is empty, but other tables are not empty.',
        InconsistentDataInDBErrorTypes.emptyOperators,
      );
    }

    /**
     * @note If the service is upgraded to the new version (so that in the previous version there was no "app_info"
     * table and this sanity checker service, but in the new version it appears), it has information in the DB. If the
     * service starts after the version upgrade with an incorrect chain ID specified in the env variables, it will lead
     * to data corruption. To prevent this case, this code checks that the curated module stored in the DB has the
     * correct address for the chain specified in the env variables.
     */
    if (dbCuratedModule.stakingModuleAddress !== REGISTRY_CONTRACT_ADDRESSES[configChainId].toLowerCase()) {
      throw new InconsistentDataInDBError(
        `Chain configuration mismatch. Service is trying to start for chain ${configChainId}, but DB contains data for another chain.`,
        InconsistentDataInDBErrorTypes.curatedModuleAddressMismatch,
      );
    }

    /**
     * @note If the service is upgraded to the new version, it doesn't have the "app_info" table yet, but the curated
     * module stored in the DB has the correct address for the chain specified in env variables, it's pretty safe to
     * assume that the service is run with the correct config. In this case, the service just stores the information
     * about chain ID and locator for which it is run into the DB.
     */
    this.logger.log('DB is not empty and chain info is not found in DB, write chain info into DB');
    await this.appInfoStorageService.update({
      chainId: configChainId,
      locatorAddress: this.locatorContract.address,
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