import { Global, LoggerService, Module } from '@nestjs/common';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { FallbackProviderModule } from '@lido-nestjs/execution';
import { NonEmptyArray } from '@lido-nestjs/execution/dist/interfaces/non-empty-array';
import { ConnectionInfo } from '@ethersproject/web';
import { PrometheusService } from '../prometheus';
import { ConfigService } from '../config';
import { ExecutionProviderService } from './execution-provider.service';
import { APP_NAME, APP_VERSION } from '../../app/app.constants';

@Global()
@Module({
  imports: [
    FallbackProviderModule.forRootAsync({
      async useFactory(configService: ConfigService, logger: LoggerService, prometheusService: PrometheusService) {
        return {
          // ConnectionInfo instead of plain strings, so providers can attribute the traffic.
          // The tuple cast is safe: validation rejects an empty PROVIDERS_URLS at startup.
          urls: configService.get('PROVIDERS_URLS').map((url) => ({
            url,
            headers: { 'User-Agent': `${APP_NAME}/${APP_VERSION}` },
          })) as unknown as NonEmptyArray<ConnectionInfo>,
          network: configService.get('CHAIN_ID'),
          requestPolicy: {
            jsonRpcMaxBatchSize: configService.get('PROVIDER_JSON_RPC_MAX_BATCH_SIZE'),
            maxConcurrentRequests: configService.get('PROVIDER_CONCURRENT_REQUESTS'),
            batchAggregationWaitMs: configService.get('PROVIDER_BATCH_AGGREGATION_WAIT_MS'),
          },
          logRetries: true,
          fetchMiddlewares: [
            async (next) => {
              const endTimer = prometheusService.elRpcRequestDuration.startTimer();

              try {
                const result = await next();
                endTimer({ result: 'success' });
                return result;
              } catch (error) {
                logger.error('Execution provider error');
                logger.error(error);
                endTimer({ result: 'error' });
                throw error;
              } finally {
                endTimer();
              }
            },
          ],
        };
      },
      inject: [ConfigService, LOGGER_PROVIDER, PrometheusService],
    }),
  ],
  providers: [ExecutionProviderService],
  exports: [ExecutionProviderService],
})
export class ExecutionProviderModule {}
