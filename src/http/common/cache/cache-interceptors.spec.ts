import { Controller, Get, HttpException, INestApplication, Res } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CacheModule } from '@nestjs/cache-manager';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import type { FastifyReply } from 'fastify';
import * as request from 'supertest';
import { SkipCache } from 'common/decorators/skipCache';
import { NoStore } from 'common/decorators/noStore';
import { CACHE_INTERCEPTORS } from './cache-interceptors';
import { NO_STORE_CACHE_CONTROL, PUBLIC_GET_CACHE_CONTROL } from './cache-headers.interceptor';

// The two interceptors together, in the order the application registers them: neither may silence the other.
describe('Response cache and Cache-Control together', () => {
  const calls = { plain: 0, stream: 0, probe: 0, failing: 0 };

  @Controller()
  class TestController {
    @Get('plain')
    plain() {
      calls.plain++;
      return { call: calls.plain };
    }

    // The shape of the key streams: kept out of the in-process cache, sends the reply itself.
    @Get('stream')
    @SkipCache()
    stream(@Res() reply: FastifyReply) {
      calls.stream++;
      reply.type('application/json').header('Cache-Control', PUBLIC_GET_CACHE_CONTROL).send({ call: calls.stream });
    }

    @Get('probe')
    @SkipCache()
    @NoStore()
    probe() {
      calls.probe++;
      return { call: calls.probe };
    }

    @Get('failing')
    failing() {
      calls.failing++;
      throw new HttpException('too early', 425);
    }
  }

  let app: INestApplication;
  const get = (url: string) => request(app.getHttpServer()).get(url);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CacheModule.register({ ttl: 60_000 })],
      controllers: [TestController],
      providers: CACHE_INTERCEPTORS,
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await (app as NestFastifyApplication).getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('a response served from the in-process cache still carries Cache-Control', async () => {
    const first = await get('/plain');
    const second = await get('/plain');

    expect(calls.plain).toBe(1);
    expect(second.body).toEqual(first.body);
    expect(first.headers['cache-control']).toBe(PUBLIC_GET_CACHE_CONTROL);
    expect(second.headers['cache-control']).toBe(PUBLIC_GET_CACHE_CONTROL);
  });

  it('a stream stays out of the in-process cache and still carries Cache-Control', async () => {
    const first = await get('/stream');
    const second = await get('/stream');

    expect(calls.stream).toBe(2);
    expect(second.body).toEqual({ call: 2 });
    expect(first.headers['cache-control']).toBe(PUBLIC_GET_CACHE_CONTROL);
    expect(second.headers['cache-control']).toBe(PUBLIC_GET_CACHE_CONTROL);
  });

  it('a probe is neither cached in process nor storable by a CDN', async () => {
    const first = await get('/probe');
    const second = await get('/probe');

    expect(calls.probe).toBe(2);
    expect(first.headers['cache-control']).toBe(NO_STORE_CACHE_CONTROL);
    expect(second.headers['cache-control']).toBe(NO_STORE_CACHE_CONTROL);
  });

  it('an error is neither cached in process nor marked public', async () => {
    const first = await get('/failing');
    const second = await get('/failing');

    expect(calls.failing).toBe(2);
    expect(first.status).toBe(425);
    expect(first.headers['cache-control']).toBeUndefined();
    expect(second.headers['cache-control']).toBeUndefined();
  });
});
