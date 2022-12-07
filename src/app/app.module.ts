import { APP_INTERCEPTOR } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { PrometheusModule } from 'common/prometheus';
import { ConfigModule, ConfigService } from 'common/config';
import { SentryInterceptor } from 'common/sentry';
import { HealthModule } from 'common/health';
import { AppService } from './app.service';
import { HTTPModule } from '../http';
import { ProviderModule } from 'common/provider';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { RegistryModule } from '../jobs';
import { ScheduleModule } from '@nestjs/schedule';
import { KeyRegistryModule } from '@lido-nestjs/registry';
import { SimpleFallbackJsonRpcBatchProvider } from '@lido-nestjs/execution';
import config from '../mikro-orm.config';

@Module({
  imports: [
    HealthModule,
    PrometheusModule,
    ConfigModule,
    ProviderModule,
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
        };
      },
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    KeyRegistryModule.forRootAsync({
      inject: [SimpleFallbackJsonRpcBatchProvider],
      async useFactory(provider) {
        return { provider };
      },
    }),
    RegistryModule,
    HTTPModule,
  ],
  providers: [{ provide: APP_INTERCEPTOR, useClass: SentryInterceptor }, AppService],
})
export class AppModule {}
