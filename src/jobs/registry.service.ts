import { CronJob } from 'cron';
import { Inject, Injectable } from '@nestjs/common';
import { OneAtTime } from '@lido-nestjs/decorators';
import {
  KeyRegistryService,
  RegistryKeyStorageService,
  RegistryMetaStorageService,
  RegistryKey,
  RegistryMeta,
} from '@lido-nestjs/registry';
import { LOGGER_PROVIDER, LoggerService } from 'common/logger';
import { PrometheusService } from 'common/prometheus';
import { ConfigService } from 'common/config';
import { JobService } from 'common/job';

@Injectable()
export class RegistryService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected readonly keyRegistryService: KeyRegistryService,
    protected readonly keyStorageService: RegistryKeyStorageService,
    protected readonly metaStorageService: RegistryMetaStorageService,
    protected readonly prometheusService: PrometheusService,
    protected readonly configService: ConfigService,
    protected readonly jobService: JobService,
  ) {}

  public async onModuleInit(): Promise<void> {
    // Do not wait for initialization to avoid blocking the main process
    this.initialize();
  }

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
  protected async updateKeys(): Promise<void> {
    await this.jobService.wrapJob({ name: 'update keys' }, async () => {
      await this.keyRegistryService.update('latest');
      await this.updateTimestamp();
    });
  }

  protected lastTimestamp = 0;

  /**
   * Updates timestamp of the last registry update
   */
  protected async updateTimestamp(): Promise<void> {
    const meta = await this.metaStorageService.get();
    this.lastTimestamp = meta?.timestamp ?? this.lastTimestamp;
  }

  /** returns all operators keys from the db */
  public async getAllKeysFromStorage(): Promise<RegistryKey[]> {
    return await this.keyStorageService.findAll();
  }

  public async getMetaDataFromStorage(): Promise<RegistryMeta> {
    return await this.metaStorageService.get();
  }

  /**
   * Returns key data by public key
   * @param pubKey - validator public key
   * @returns key data from DB
   */
  public async getOperatorKey(pubKey: string): Promise<RegistryKey | null> {
    const keys = await this.keyStorageService.findByPubkey(pubKey);
    return keys?.[0] ?? null;
  }

  /**
   * Updates prometheus metrics
   */
  protected updateMetrics() {
    this.prometheusService.registryLastUpdate.set(this.lastTimestamp);

    this.logger.log('Registry metrics updated');
  }
}
