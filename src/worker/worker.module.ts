import { Module } from '@nestjs/common';
import { WorkerStarter } from './worker.starter';

@Module({
  providers: [WorkerStarter],
})
export class WorkerModule {}
