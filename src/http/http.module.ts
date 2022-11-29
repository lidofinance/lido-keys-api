import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { CacheInterceptor, MiddlewareConsumer, Module } from '@nestjs/common';

import { HEALTH_URL } from 'common/health';
import { METRICS_URL } from 'common/prometheus';

import { SWAGGER_URL } from './common/swagger';
import { ThrottlerModule, ThrottlerBehindProxyGuard } from './common/throttler';
import { LoggerMiddleware, MetricsMiddleware } from './common/middleware';
import { CacheModule } from './common/cache';
import { KeysModule } from './keys';
import { ModulesModule } from './modules';

@Module({
  imports: [KeysModule, ModulesModule, CacheModule, ThrottlerModule],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerBehindProxyGuard },
    { provide: APP_INTERCEPTOR, useClass: CacheInterceptor },
  ],
})
export class HTTPModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(MetricsMiddleware, LoggerMiddleware)
      .exclude(`${SWAGGER_URL}/(.*)`, SWAGGER_URL, METRICS_URL, HEALTH_URL)
      .forRoutes('*');
  }
}
