import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrometheusService } from 'common/prometheus';
import { isMainThread, Worker } from 'worker_threads';

@Injectable()
export class WorkerService implements OnModuleInit, OnModuleDestroy {
  constructor(protected readonly prometheusService: PrometheusService) {}
  private worker: Worker | undefined;

  // we need to run this module only if validators_registry_enabled = false
  onModuleInit() {
    if (isMainThread) {
      console.log('run worker');
      this.worker = new Worker(__dirname + '/../worker.js', { workerData: {} });

      this.worker.on('message', this.handleMessage.bind(this));

      //   // Optionally, listen for errors and exits as well
      //   this.worker.on('error', this.handleError.bind(this));
      //   this.worker.on('exit', (code) => this.handleExit(code));
    }
  }

  onModuleDestroy() {
    this.worker?.terminate();
  }

  private handleMessage({
    lastBlockTimestampSec,
    lastBlockNumber,
    lastSlot,
  }: {
    lastBlockTimestampSec: number;
    lastBlockNumber: number;
    lastSlot: number;
  }) {
    this.prometheusService.validatorsRegistryLastTimestampUpdate.set(lastBlockTimestampSec);
    this.prometheusService.validatorsRegistryLastBlockNumber.set(lastBlockNumber);
    this.prometheusService.validatorsRegistryLastSlot.set(lastSlot);
  }
}
