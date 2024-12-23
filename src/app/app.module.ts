import { APP_INTERCEPTOR } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { PrometheusModule } from '../common/prometheus';
import { ConfigModule, ConfigService } from '../common/config';
import { SentryInterceptor } from '../common/sentry';
import { HealthModule } from '../common/health';
import { AppService } from './app.service';
import { HTTPModule } from '../http/';
import { ExecutionProviderModule } from '../common/execution-provider';
import { ConsensusProviderModule } from '../common/consensus-provider';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { JobsModule } from '../jobs';
import { ScheduleModule } from '@nestjs/schedule';
import config from '../mikro-orm.config';
import { ValidatorsModule } from '../validators';
import { LoggerModule } from '@lido-nestjs/logger';
import { SimpleFallbackJsonRpcBatchProvider } from '@lido-nestjs/execution';
import { KeyRegistryModule } from '../common/registry';
import { StakingRouterModule } from '../staking-router-modules';
import { CSMKeyRegistryModule } from 'common/registry-csm';

@Module({
  imports: [
    HealthModule,
    PrometheusModule,
    LoggerModule,
    ConfigModule,
    ExecutionProviderModule,
    ConsensusProviderModule,
    MikroOrmModule.forRootAsync({
      async useFactory(configService: ConfigService) {
        return {
          ...config,
          dbName: configService.get('DB_NAME'),
          host: configService.get('DB_HOST'),
          port: configService.get('DB_PORT'),
          user: configService.get('DB_USER'),
          password: configService.get('DB_PASSWORD'),
          autoLoadEntities: false,
          cache: { enabled: false },
          debug: false,
          registerRequestContext: true,
          allowGlobalContext: false,
        };
      },
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    KeyRegistryModule.forRootAsync({
      inject: [SimpleFallbackJsonRpcBatchProvider, ConfigService],
      async useFactory(provider: SimpleFallbackJsonRpcBatchProvider, configService: ConfigService) {
        return {
          provider,
          keysBatchSize: configService.get('KEYS_FETCH_BATCH_SIZE'),
        };
      },
    }),
    CSMKeyRegistryModule.forRootAsync({
      inject: [SimpleFallbackJsonRpcBatchProvider, ConfigService],
      async useFactory(provider: SimpleFallbackJsonRpcBatchProvider, configService: ConfigService) {
        return {
          provider,
          keysBatchSize: configService.get('KEYS_FETCH_BATCH_SIZE'),
        };
      },
    }),
    StakingRouterModule,
    ValidatorsModule,
    JobsModule,
    HTTPModule,
  ],
  providers: [{ provide: APP_INTERCEPTOR, useClass: SentryInterceptor }, AppService],
})
export class AppModule {}
