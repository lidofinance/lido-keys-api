import { Inject } from '@nestjs/common';
import { parentPort } from 'worker_threads';
import { LOGGER_PROVIDER, LoggerService } from '../logger';
import { isWorkerMetricMessage, WorkerMetricMessage } from './interfaces/worker-metrics.interface';
import { PrometheusService } from './prometheus.service';

export class WorkerMetricsHandler {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected readonly prometheusService: PrometheusService,
  ) {}

  public postMetric(metric: WorkerMetricMessage) {
    parentPort?.postMessage(metric);
  }

  public handleMetrics(message: any) {
    if (!isWorkerMetricMessage(message)) {
      this.logger.error('Got unexpected message from worker thread.');
      this.logger.log(message);
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
  }
}
