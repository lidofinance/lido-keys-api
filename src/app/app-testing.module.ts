import { APP_INTERCEPTOR } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { PrometheusModule } from '../common/prometheus';
import { ConfigModule } from '../common/config';
import { SentryInterceptor } from '../common/sentry';
import { HealthModule } from '../common/health';
import { AppService } from './app.service';
import { ExecutionProviderModule } from '../common/execution-provider';
import { ConsensusProviderModule } from '../common/consensus-provider';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule, nullTransport } from '@lido-nestjs/logger';
import { SimpleFallbackJsonRpcBatchProvider } from '@lido-nestjs/execution';
import { KeyRegistryModule } from '../common/registry';
import { StakingRouterModule } from '../staking-router-modules';
import { KeysUpdateModule } from '../jobs/keys-update';

@Module({
  imports: [
    HealthModule,
    PrometheusModule,
    ConfigModule,
    ExecutionProviderModule,
    ConsensusProviderModule,
    MikroOrmModule.forRoot({
      dbName: ':memory:',
      type: 'sqlite',
      allowGlobalContext: true,
      entities: ['./**/*.entity.ts'],
    }),
    LoggerModule.forRoot({ transports: [nullTransport()] }),
    ScheduleModule.forRoot(),
    KeyRegistryModule.forRootAsync({
      inject: [SimpleFallbackJsonRpcBatchProvider],
      async useFactory(provider) {
        return { provider };
      },
    }),
    StakingRouterModule,
    KeysUpdateModule,
  ],
  providers: [{ provide: APP_INTERCEPTOR, useClass: SentryInterceptor }, AppService],
})
export class AppModule {}
