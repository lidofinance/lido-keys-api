import { Global, Module } from '@nestjs/common';
import { PrometheusModule as PrometheusModuleSource } from '@willsoto/nestjs-prometheus';
import { WorkerMetricsHandler } from './worker-metrics-handler';
import { METRICS_URL } from './prometheus.constants';
import { PrometheusController } from './prometheus.controller';
import { PrometheusService } from './prometheus.service';

@Global()
@Module({
  imports: [
    PrometheusModuleSource.register({
      controller: PrometheusController,
      path: METRICS_URL,
      defaultMetrics: { enabled: true },
    }),
  ],
  providers: [PrometheusService, WorkerMetricsHandler],
  exports: [PrometheusService, WorkerMetricsHandler],
})
export class PrometheusModule {}
