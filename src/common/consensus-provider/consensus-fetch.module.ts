import { HttpException, Module } from '@nestjs/common';
import { FetchService, FETCH_GLOBAL_OPTIONS_TOKEN } from '@lido-nestjs/fetch';
import { MiddlewareModule } from '@lido-nestjs/middleware';
import { ConfigService } from '../config';
import { PrometheusService } from '../prometheus';
import { CONSENSUS_RETRY_ATTEMPTS, CONSENSUS_RETRY_DELAY } from './consensus-provider.constants';
import { ConsensusFetchService } from './consensus-fetch.service';
import { isMainThread } from 'worker_threads';
import { WorkerMetricsHandler } from '../prometheus/worker-metrics-handler';

@Module({
  imports: [MiddlewareModule],
  providers: [
    {
      provide: FETCH_GLOBAL_OPTIONS_TOKEN,
      async useFactory(
        configService: ConfigService,
        prometheusService: PrometheusService,
        workerMetricsHandler: WorkerMetricsHandler,
      ) {
        return {
          baseUrls: configService.get('CL_API_URLS'),
          retryPolicy: {
            delay: CONSENSUS_RETRY_DELAY,
            attempts: CONSENSUS_RETRY_ATTEMPTS,
          },
          middlewares: [
            async (next) => {
              const endTimer = prometheusService.clApiRequestDuration.startTimer();

              try {
                const result = await next();
                const value = endTimer({ result: 'success', status: 200 });

                if (!isMainThread) {
                  workerMetricsHandler.postMetric({
                    type: 'metric',
                    data: {
                      name: 'cl_api_requests_duration_seconds',
                      labels: { result: 'success', status: 200 },
                      value,
                    },
                  });
                }

                return result;
              } catch (error) {
                const status = error instanceof HttpException ? error.getStatus() : 'unknown';
                const value = endTimer({ result: 'error', status });

                if (!isMainThread) {
                  workerMetricsHandler.postMetric({
                    type: 'metric',
                    data: { name: 'cl_api_requests_duration_seconds', labels: { result: 'error', status }, value },
                  });
                }

                throw error;
              }
            },
          ],
        };
      },
      inject: [ConfigService, PrometheusService, WorkerMetricsHandler],
    },
    {
      provide: FetchService,
      useClass: ConsensusFetchService,
    },
  ],
  exports: [FetchService],
})
export class ConsensusFetchModule {}
