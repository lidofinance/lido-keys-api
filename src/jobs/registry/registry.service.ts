import { CronJob } from 'cron';
import { Inject, Injectable } from '@nestjs/common';
import { OneAtTime } from '@lido-nestjs/decorators';
import {
  KeyRegistryService,
  RegistryKeyStorageService,
  RegistryMetaStorageService,
  RegistryKey,
  RegistryMeta,
  RegistryOperator,
  RegistryOperatorStorageService,
} from '@lido-nestjs/registry';
import { LOGGER_PROVIDER, LoggerService } from 'common/logger';
import { PrometheusService } from 'common/prometheus';
import { ConfigService } from 'common/config';
import { JobService } from 'common/job';
import { EntityManager } from '@mikro-orm/postgresql';
import { KeyQuery } from 'http/common/entities';

@Injectable()
export class RegistryService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected readonly keyRegistryService: KeyRegistryService,
    protected readonly keyStorageService: RegistryKeyStorageService,
    protected readonly metaStorageService: RegistryMetaStorageService,
    protected readonly operatorStorageService: RegistryOperatorStorageService,
    protected readonly prometheusService: PrometheusService,
    protected readonly configService: ConfigService,
    protected readonly jobService: JobService,
    private readonly entityManager: EntityManager,
  ) {}

  /**
   * Initializes the job
   */
  public async initialize(): Promise<void> {
    await this.updateKeys();

    const cronTime = this.configService.get('JOB_INTERVAL_REGISTRY');
    const job = new CronJob(cronTime, () => this.updateKeys());
    job.start();

    this.logger.log('Service initialized', { service: 'registry', cronTime });
  }

  /**
   * Collects updates from the registry contract and saves the changes to the database
   */
  @OneAtTime()
  private async updateKeys(): Promise<void> {
    await this.jobService.wrapJob({ name: 'Update keys from NodeOperatorRegistry' }, async () => {
      await this.keyRegistryService.update('latest');

      // Update cached data to quick access
      await Promise.all([this.updateMetaForMetrics(), this.updateOperatorsMap()]);

      this.updateMetrics();
    });
  }

  protected lastTimestamp: number | undefined = undefined;
  protected lastBlockNumber: number | undefined = undefined;
  protected lastNonce: number | undefined = undefined;
  protected operatorsMap: Record<number, RegistryOperator> = {};

  /**
   * Updates timestamp of the last registry update
   */
  private async updateMetaForMetrics(): Promise<void> {
    const meta = await this.metaStorageService.get();
    this.lastTimestamp = meta?.timestamp ?? this.lastTimestamp;
    this.lastBlockNumber = meta?.blockNumber ?? this.lastBlockNumber;
    this.lastNonce = meta?.keysOpIndex ?? this.lastNonce;
  }

  /**
   * Updates cached operators map
   */
  protected async updateOperatorsMap(): Promise<void> {
    const operators = await this.operatorStorageService.findAll();

    this.operatorsMap = operators.reduce((operatorsMap, operator) => {
      operatorsMap[operator.index] = operator;
      return operatorsMap;
    }, {});
  }

  public async getKeyWithMetaByPubkey(pubkey: string): Promise<{ keys: RegistryKey[]; meta: RegistryMeta | null }> {
    const { keys, meta } = await this.entityManager.transactional(async () => {
      const keys = await this.keyStorageService.findByPubkey(pubkey.toLocaleLowerCase());
      const meta = await this.getMetaDataFromStorage();

      return { keys, meta };
    });

    return { keys, meta };
  }

  public async getKeysWithMetaByPubkeys(
    pubkeys: string[],
  ): Promise<{ keys: RegistryKey[]; meta: RegistryMeta | null }> {
    const { keys, meta } = await this.entityManager.transactional(async () => {
      const keys = await this.getKeysByPubkeys(pubkeys);
      const meta = await this.getMetaDataFromStorage();

      return { keys, meta };
    });

    return { keys, meta };
  }

  // TODO: add interface to filters
  public async getKeysWithMeta(filters): Promise<{ keys: RegistryKey[]; meta: RegistryMeta | null }> {
    const { keys, meta } = await this.entityManager.transactional(async () => {
      const keys = await this.keyStorageService.find(filters);
      const meta = await this.getMetaDataFromStorage();

      return { keys, meta };
    });

    return { keys, meta };
  }

  public async getMetaDataFromStorage(): Promise<RegistryMeta | null> {
    return await this.metaStorageService.get();
  }

  public async getOperatorsWithMeta(): Promise<{ operators: RegistryOperator[]; meta: RegistryMeta | null }> {
    const { operators, meta } = await this.entityManager.transactional(async () => {
      const operators = await this.operatorStorageService.findAll();
      const meta = await this.getMetaDataFromStorage();

      return { operators, meta };
    });

    return { operators, meta };
  }

  public async getOperatorByIndex(
    index: number,
  ): Promise<{ operator: RegistryOperator | null; meta: RegistryMeta | null }> {
    const { operator, meta } = await this.entityManager.transactional(async () => {
      const operator = await this.operatorStorageService.findOneByIndex(index);
      const meta = await this.getMetaDataFromStorage();

      return { operator, meta };
    });

    return { operator, meta };
  }

  public async getData(filters: KeyQuery): Promise<{
    operators: RegistryOperator[];
    keys: RegistryKey[];
    meta: RegistryMeta | null;
  }> {
    const { operators, keys, meta } = await this.entityManager.transactional(async () => {
      const operatorFilters = filters.operatorIndex ? { index: filters.operatorIndex } : {};
      const operators = await this.operatorStorageService.find(operatorFilters);
      const keys = await this.keyStorageService.find(filters);
      const meta = await this.getMetaDataFromStorage();

      return { operators, keys, meta };
    });

    return { operators, keys, meta };
  }

  /**
   * Returns all keys found in db from pubkey list
   * @param pubKeys - public keys
   * @returns keys from DB
   */
  private async getKeysByPubkeys(pubKeys: string[]): Promise<RegistryKey[]> {
    return await this.keyStorageService.find({ key: { $in: pubKeys } });
  }

  /**
   * Updates prometheus metrics
   */
  private updateMetrics() {
    // soon we will get this value from SR contract from the list of modules
    this.lastTimestamp && this.prometheusService.registryLastUpdate.set(this.lastTimestamp);
    this.lastBlockNumber && this.prometheusService.registryBlockNumber.set(this.lastBlockNumber);
    // this value will be different for all SR modules
    this.lastNonce && this.prometheusService.registryNonce.set({ srModuleId: 1 }, this.lastNonce);

    const operators = Object.values(this.operatorsMap);

    this.prometheusService.registryNumberOfKeysBySRModuleAndOperator.reset();

    operators.forEach((operator) => {
      this.prometheusService.registryNumberOfKeysBySRModuleAndOperator.set(
        {
          operator: operator.index,
          srModuleId: 1,
          used: 'true',
        },
        operator.usedSigningKeys,
      );

      this.prometheusService.registryNumberOfKeysBySRModuleAndOperator.set(
        {
          operator: operator.index,
          srModuleId: 1,
          used: 'false',
        },
        operator.totalSigningKeys - operator.usedSigningKeys,
      );
    });

    this.logger.log('Registry metrics updated');
  }
}
