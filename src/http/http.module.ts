import { APP_GUARD } from '@nestjs/core';
import { MiddlewareConsumer, Module } from '@nestjs/common';

import { HEALTH_URL } from '../common/health';
import { METRICS_URL } from '../common/prometheus';

import { SWAGGER_URL } from './common/swagger';
import { ThrottlerModule, ThrottlerBehindProxyGuard } from './common/throttler';
import { LoggerMiddleware, MetricsMiddleware } from './common/middleware';
import { CacheModule } from './common/cache';
import { KeysModule } from './keys';
import { SRModulesModule } from './sr-modules';
import { SRModulesValidatorsModule } from './sr-modules-validators';
import { SRModulesKeysModule } from './sr-modules-keys';
import { SRModulesOperatorsModule } from './sr-modules-operators';
import { SRModulesOperatorsKeysModule } from './sr-modules-operators-keys';
import { StatusModule } from './status';
import { CACHE_INTERCEPTORS } from './common/cache/cache-interceptors';

@Module({
  imports: [
    KeysModule,
    SRModulesModule,
    SRModulesKeysModule,
    SRModulesValidatorsModule,
    SRModulesOperatorsModule,
    SRModulesOperatorsKeysModule,
    StatusModule,
    CacheModule,
    ThrottlerModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerBehindProxyGuard }, ...CACHE_INTERCEPTORS],
})
export class HTTPModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(MetricsMiddleware, LoggerMiddleware)
      .exclude(
        SWAGGER_URL,
        `${SWAGGER_URL}/{*path}`,
        // the OpenAPI document that SwaggerModule serves next to the UI
        `${SWAGGER_URL}-json`,
        METRICS_URL,
        HEALTH_URL,
        `${HEALTH_URL}/{*path}`,
      )
      .forRoutes('{*path}');
  }
}
