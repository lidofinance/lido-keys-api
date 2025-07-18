import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { MiddlewareConsumer, Module } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';

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
