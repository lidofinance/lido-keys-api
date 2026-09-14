import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of, throwError } from 'rxjs';
import { CacheHeadersInterceptor, NO_STORE_CACHE_CONTROL, PUBLIC_GET_CACHE_CONTROL } from './cache-headers.interceptor';

describe('CacheHeadersInterceptor', () => {
  const makeResponse = () => {
    const headers: Record<string, string> = {};
    return {
      headers,
      sent: false,
      header(name: string, value: string) {
        headers[name] = value;
      },
    };
  };

  const makeContext = (method: string, response: ReturnType<typeof makeResponse>): ExecutionContext =>
    ({
      getType: () => 'http',
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ method }),
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext);

  const makeInterceptor = (skip: boolean) => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(skip) } as unknown as Reflector;
    return new CacheHeadersInterceptor(reflector);
  };

  const next = (result = 'payload'): CallHandler => ({ handle: () => of(result) });

  it('sets the public header on a successful GET', async () => {
    const response = makeResponse();
    await lastValueFrom(makeInterceptor(false).intercept(makeContext('GET', response), next()));
    expect(response.headers['Cache-Control']).toBe(PUBLIC_GET_CACHE_CONTROL);
  });

  it('sets no-store on routes marked with SkipCache', async () => {
    const response = makeResponse();
    await lastValueFrom(makeInterceptor(true).intercept(makeContext('GET', response), next()));
    expect(response.headers['Cache-Control']).toBe(NO_STORE_CACHE_CONTROL);
  });

  it('sets no header when the handler errors', async () => {
    const response = makeResponse();
    const failing: CallHandler = { handle: () => throwError(() => new Error('boom')) };
    await expect(
      lastValueFrom(makeInterceptor(false).intercept(makeContext('GET', response), failing)),
    ).rejects.toThrow('boom');
    expect(response.headers['Cache-Control']).toBeUndefined();
  });

  it('sets no header on non-GET requests', async () => {
    const response = makeResponse();
    await lastValueFrom(makeInterceptor(false).intercept(makeContext('POST', response), next()));
    expect(response.headers['Cache-Control']).toBeUndefined();
  });

  it('does not touch a response that is already sent', async () => {
    const response = makeResponse();
    response.sent = true;
    await lastValueFrom(makeInterceptor(false).intercept(makeContext('GET', response), next()));
    expect(response.headers['Cache-Control']).toBeUndefined();
  });
});
