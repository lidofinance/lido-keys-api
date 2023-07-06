import { Worker, isMainThread } from 'worker_threads';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkerStarter {
  protected worker: Worker | null = null;

  public constructor() {
    if (isMainThread) {
      this.worker = new Worker(__dirname + '/../worker.js', { workerData: {} });

      process.on('SIGTERM', async () => {
        console.log('terminating worker');
        await this.worker?.terminate();
        console.log('terminating worker done');
      });
    }
  }
}
