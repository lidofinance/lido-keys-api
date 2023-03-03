import { HttpException, Module } from '@nestjs/common';
import { FetchService, FETCH_GLOBAL_OPTIONS_TOKEN } from '@lido-nestjs/fetch';
import { MiddlewareModule } from '@lido-nestjs/middleware';
import { ConfigService } from 'common/config';
import { PrometheusService } from 'common/prometheus';
import { CONSENSUS_RETRY_ATTEMPTS, CONSENSUS_RETRY_DELAY } from './consensus-provider.constants';
import { ConsensusFetchService } from './consensus-fetch.service';

@Module({
  imports: [MiddlewareModule],
  providers: [
    {
      provide: FETCH_GLOBAL_OPTIONS_TOKEN,
      async useFactory(configService: ConfigService, prometheusService: PrometheusService) {
        if (!configService.get('VALIDATOR_REGISTRY_ENABLE')) {
          return {};
        }

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
                endTimer({ result: 'success', status: 200 });
                return result;
              } catch (error) {
                const status = error instanceof HttpException ? error.getStatus() : 'unknown';

                endTimer({ result: 'error', status });
                throw error;
              }
            },
          ],
        };
      },
      inject: [ConfigService, PrometheusService],
    },
    {
      provide: FetchService,
      useClass: ConsensusFetchService,
    },
  ],
  exports: [FetchService],
})
export class ConsensusFetchModule {}
