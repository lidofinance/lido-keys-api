import { Injectable, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import { ConfigService } from '../common/config';
import { PrometheusService } from '../common/prometheus';
import { isMainThread, Worker } from 'worker_threads';
import { LOGGER_PROVIDER, LoggerService } from '../common/logger';

export type ValidatorsUpdateMetrics = {
  lastBlockTimestampSec: number | undefined;
  lastBlockNumber: number | undefined;
  lastSlot: number | undefined;
};

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
      console.log('run worker');
      this.worker = new Worker(__dirname + '/../validators-update-worker.js', { workerData: {} });

      this.worker.on('message', this.handleValidatorsUpdateMetrics.bind(this));
    }
  }

  onModuleDestroy() {
    if (isMainThread && this.isEnabledRegistry()) {
      this.worker?.terminate();
    }
  }

  private handleValidatorsUpdateMetrics({ lastBlockTimestampSec, lastBlockNumber, lastSlot }: ValidatorsUpdateMetrics) {
    if (lastBlockTimestampSec) {
      this.prometheusService.validatorsRegistryLastTimestampUpdate.set(lastBlockTimestampSec);
    }

    if (lastBlockNumber) {
      this.prometheusService.validatorsRegistryLastBlockNumber.set(lastBlockNumber);
    }

    if (lastSlot) {
      this.prometheusService.validatorsRegistryLastSlot.set(lastSlot);
    }

    this.logger.log('ValidatorsRegistry metrics updated');
  }
}
