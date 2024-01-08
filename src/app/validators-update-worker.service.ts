import { Injectable, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import { ConfigService } from '../common/config';
import { PrometheusService } from '../common/prometheus';
import { isMainThread, Worker } from 'worker_threads';
import { LOGGER_PROVIDER, LoggerService } from '../common/logger';

@Injectable()
export class ValidatorsUpdateWorkerService implements OnModuleInit, OnModuleDestroy {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected readonly prometheusService: PrometheusService,
    protected readonly configService: ConfigService,
  ) {}
  private worker: Worker | undefined;

  public isEnabledRegistry() {
    return this.configService.get('VALIDATOR_REGISTRY_ENABLE');
  }

  // we need to run this module only if validators_registry_enabled = false
  onModuleInit() {
    if (!this.isEnabledRegistry()) {
      this.prometheusService.validatorsEnabled.set(0);
      return;
    }
    this.prometheusService.validatorsEnabled.set(1);

    if (isMainThread) {
      this.worker = new Worker(__dirname + '/../validators-update-worker.js', { workerData: {} });

      this.worker.on('message', (message) => this.handleMetrics(message));

      this.worker.on('error', (err) => {
        // how to restart worker?? or shutdown app
        this.logger.error(err);
      });
    }
  }

  onModuleDestroy() {
    if (isMainThread && this.isEnabledRegistry()) {
      this.worker?.terminate();
    }
  }

  private handleMetrics(message) {
    if (message.type !== 'metric') {
      this.logger.error('Got unexpected type of message from worker thread.');
      process.exit(0);
    }

    // check type of message
    if (message.data.name === 'job_duration_seconds') {
      this.prometheusService.jobDuration.observe(
        { job: message.data.labels.job, result: message.data.labels.result },
        message.data.value,
      );

      return;
    }

    if (message.data.name === 'cl_api_requests_duration_seconds') {
      this.prometheusService.clApiRequestDuration.observe(
        { result: message.data.labels.result, status: message.data.labels.status },
        message.data.value,
      );

      return;
    }

    if (message.data.name === 'validators_registry_last_block_number') {
      this.prometheusService.validatorsRegistryLastBlockNumber.set(message.data.value);
      this.logger.log('ValidatorsRegistry metrics updated');
      return;
    }

    if (message.data.name === 'validators_registry_last_update_block_timestamp') {
      this.prometheusService.validatorsRegistryLastTimestampUpdate.set(message.data.value);
      this.logger.log('ValidatorsRegistry metrics updated');
      return;
    }

    if (message.data.name === 'validators_registry_last_slot') {
      this.prometheusService.validatorsRegistryLastSlot.set(message.data.value);
      this.logger.log('ValidatorsRegistry metrics updated');
      return;
    }

    // other metrics should not be provided by worker thread
    this.logger.error('Got unexpected metric from worker thread.');
    this.logger.log(message);
    process.exit(0);
  }
}
