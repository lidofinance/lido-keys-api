import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { NO_STORE_KEY } from 'common/decorators/noStore';

// Lido default for public GETs, the key streams included, so the CDN can absorb load on the heavy
// endpoints instead of passing every request to origin. A stale answer is still marked: every
// answer carries the block it was read at.
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

    // Before the handler: the header must also be on answers the handler sends itself.
    const noStore = this.reflector.getAllAndOverride<boolean>(NO_STORE_KEY, [context.getHandler(), context.getClass()]);
    if (noStore) {
      response.header('Cache-Control', NO_STORE_CACHE_CONTROL);
      return next.handle();
    }

    // On success only: an error response carrying `public` could be stored by a shared cache,
    // pinning a 4xx/5xx for max-age. tap fires before Nest writes a returned value, but after
    // a handler that sends the reply itself (the streams): those set their own header before send.
    return next.handle().pipe(
      tap(() => {
        if (!response.sent) {
          response.header('Cache-Control', PUBLIC_GET_CACHE_CONTROL);
        }
      }),
    );
  }
}
