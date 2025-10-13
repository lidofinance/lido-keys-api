import { CacheInterceptor, CACHE_KEY_METADATA } from '@nestjs/cache-manager';
import { ExecutionContext, Injectable } from '@nestjs/common';
import { SKIP_CACHE_KEY } from 'common/decorators/skipCache';

@Injectable()
export class CustomCacheInterceptor extends CacheInterceptor {
  trackBy(context: ExecutionContext): string | undefined {
    const shouldSkip = this.reflector.getAllAndOverride<boolean>(SKIP_CACHE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (shouldSkip) {
      return undefined;
    }

    const httpAdapter = this.httpAdapterHost.httpAdapter;
    const isHttpApp = httpAdapter && !!httpAdapter.getRequestMethod;
    const cacheMetadata = this.reflector.get(CACHE_KEY_METADATA, context.getHandler());

    if (!isHttpApp || cacheMetadata) {
      return cacheMetadata;
    }

    const request = context.getArgByIndex(0);
    if (!this.isRequestCacheable(context)) {
      return undefined;
    }
    return httpAdapter.getRequestUrl(request);
  }
}
