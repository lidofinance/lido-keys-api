import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { SKIP_CACHE_KEY } from 'common/decorators/skipCache';

// Lido default for rarely changing public GETs, so the CDN can absorb load on the heavy
// endpoints instead of passing every request to origin.
export const PUBLIC_GET_CACHE_CONTROL = 'public, max-age=30, stale-if-error=1200, stale-while-revalidate=30';

// Probe and metrics answers must never be reused by any cache: a stored 200 keeps answering
// through an outage.
export const NO_STORE_CACHE_CONTROL = 'no-store';

@Injectable()
export class CacheHeadersInterceptor implements NestInterceptor {
  constructor(protected readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const request = context.switchToHttp().getRequest();
    if (request.method !== 'GET') return next.handle();

    const response = context.switchToHttp().getResponse();

    // The routes that skip the in-process response cache are exactly the ones no shared cache
    // may store either: probes and metrics.
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_CACHE_KEY, [context.getHandler(), context.getClass()]);
    if (skip) {
      response.header('Cache-Control', NO_STORE_CACHE_CONTROL);
      return next.handle();
    }

    // On success only: an error response carrying `public` could be stored by a shared cache,
    // pinning a 4xx/5xx for max-age. tap fires before the body is written, so streamed
    // responses get the header too.
    return next.handle().pipe(
      tap(() => {
        if (!response.sent) {
          response.header('Cache-Control', PUBLIC_GET_CACHE_CONTROL);
        }
      }),
    );
  }
}
