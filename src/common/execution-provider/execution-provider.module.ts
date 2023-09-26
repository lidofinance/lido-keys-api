import { Global, Module } from '@nestjs/common';
import { FallbackProviderModule } from '@lido-nestjs/execution';
import { PrometheusService } from '../prometheus';
import { ConfigService } from '../config';
import { ExecutionProviderService } from './execution-provider.service';

@Global()
@Module({
  imports: [
    FallbackProviderModule.forRootAsync({
      async useFactory(configService: ConfigService, prometheusService: PrometheusService) {
        return {
          urls: configService.get('PROVIDERS_URLS'),
          network: configService.get('CHAIN_ID'),
          requestPolicy: {
            jsonRpcMaxBatchSize: configService.get('PROVIDER_JSON_RPC_MAX_BATCH_SIZE'),
            maxConcurrentRequests: configService.get('PROVIDER_CONCURRENT_REQUESTS'),
            batchAggregationWaitMs: configService.get('PROVIDER_BATCH_AGGREGATION_WAIT_MS'),
          },
          fetchMiddlewares: [
            async (next) => {
              const endTimer = prometheusService.elRpcRequestDuration.startTimer();

              try {
                const result = await next();
                endTimer({ result: 'success' });
                return result;
              } catch (error) {
                endTimer({ result: 'error' });
                throw error;
              } finally {
                endTimer();
              }
            },
          ],
        };
      },
      inject: [ConfigService, PrometheusService],
    }),
  ],
  providers: [ExecutionProviderService],
  exports: [ExecutionProviderService],
})
export class ExecutionProviderModule {}
