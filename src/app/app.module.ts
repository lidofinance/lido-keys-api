import { APP_INTERCEPTOR } from '@nestjs/core';
import { Module } from '@nestjs/common';

import { PrometheusModule } from 'common/prometheus';
import { ConfigModule } from 'common/config';
import { SentryInterceptor } from 'common/sentry';
import { HealthModule } from 'common/health';
import { AppService } from './app.service';
import { HTTPModule } from '../http';

@Module({
  imports: [HTTPModule, HealthModule, PrometheusModule, ConfigModule],
  providers: [{ provide: APP_INTERCEPTOR, useClass: SentryInterceptor }, AppService],
})
export class AppModule {}
