import { Provider } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CacheHeadersInterceptor } from './cache-headers.interceptor';
import { CustomCacheInterceptor } from './cache.service';

// Order matters: the first one wraps the second. The response cache answers a hit without calling
// what it wraps, so the headers interceptor must be outside it to stamp Cache-Control on hits too.
export const CACHE_INTERCEPTORS: Provider[] = [
  { provide: APP_INTERCEPTOR, useClass: CacheHeadersInterceptor },
  { provide: APP_INTERCEPTOR, useClass: CustomCacheInterceptor },
];
