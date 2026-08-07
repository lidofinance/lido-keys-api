import { ExecutionContext } from '@nestjs/common';
import { ThrottlerException, ThrottlerStorageService } from '@nestjs/throttler';
import type { FastifyRequest } from 'fastify';
import { ThrottlerBehindProxyGuard } from './throttler.guard';

const IPV6_PREFIX = '2001:db8:1234:5678';
const TTL_MS = 60_000;
const LIMIT = 5;

const buildRequest = (ip: string): FastifyRequest =>
  ({
    ip,
    ips: [ip],
    headers: {},
  } as unknown as FastifyRequest);

const buildContext = (request: FastifyRequest): ExecutionContext => {
  const response = { header: () => undefined };

  return {
    getClass: () => ({ name: 'RateLimitedController' }),
    getHandler: () => ({ name: 'readStatus' }),
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;
};

describe('ThrottlerBehindProxyGuard', () => {
  let guard: ThrottlerBehindProxyGuard;
  let storage: ThrottlerStorageService;

  // getTracker is protected; call it directly for unit-level assertions
  const track = (ip: string): Promise<string> => (guard as any).getTracker(buildRequest(ip));

  beforeEach(async () => {
    storage = new ThrottlerStorageService();
    guard = new ThrottlerBehindProxyGuard({ throttlers: [{ ttl: TTL_MS, limit: LIMIT }] } as any, storage, {
      getAllAndOverride: () => undefined,
    } as any);
    await guard.onModuleInit();
  });

  afterEach(() => {
    // the real storage service schedules an expiry timer for every accepted hit
    storage.onApplicationShutdown();
  });

  describe('getTracker normalization', () => {
    it('returns an IPv4 address unchanged', async () => {
      await expect(track('10.0.0.1')).resolves.toBe('10.0.0.1');
    });

    it('aggregates two IPv6 addresses from the same /64 to the same tracker', async () => {
      const a = await track(`${IPV6_PREFIX}::101`);
      const b = await track(`${IPV6_PREFIX}::102`);
      expect(a).toBe(`${IPV6_PREFIX}::/64`);
      expect(b).toBe(a);
    });

    it('keeps IPv6 addresses from different /64 blocks in distinct trackers', async () => {
      const a = await track(`${IPV6_PREFIX}::1`);
      const b = await track('2001:db8:1234:9999::1');
      expect(a).not.toBe(b);
    });

    it('unwraps IPv4-mapped IPv6 to plain IPv4 (not a shared ::/64 bucket)', async () => {
      await expect(track('::ffff:10.0.0.5')).resolves.toBe('10.0.0.5');
      const mappedA = await track('::ffff:10.0.0.5');
      const mappedB = await track('::ffff:10.0.0.6');
      expect(mappedA).not.toBe(mappedB);
    });

    it('does not misclassify a non-mapped IPv6 written with dotted-quad as IPv4', async () => {
      // 2001:db8::1.2.3.4 is a real IPv6 address — the dotted-quad is just an
      // alternate way to write the last 32 bits (0102:0304). It is NOT an
      // IPv4-mapped address (::ffff:0:0/96), so it must be aggregated by /64,
      // not collapsed into the IPv4 bucket 1.2.3.4 (which would collide with the
      // real IPv4 client 1.2.3.4 and with any other ...::1.2.3.4).
      await expect(track('2001:db8::1.2.3.4')).resolves.toBe('2001:db8::/64');
    });

    it('unwraps an IPv4-mapped IPv6 written in hex form to plain IPv4', async () => {
      // ::ffff:0102:0304 is the hex spelling of ::ffff:1.2.3.4 — a genuine
      // IPv4-mapped address that must unwrap to 1.2.3.4 regardless of notation.
      await expect(track('::ffff:0102:0304')).resolves.toBe('1.2.3.4');
    });

    it('falls back to the raw string for unparseable input', async () => {
      await expect(track('not-an-ip')).resolves.toBe('not-an-ip');
    });
  });

  describe('rate-limit bucketing (issue 87 regression)', () => {
    it('blocks a second IPv6 address in the same /64 after the first exhausts the limit', async () => {
      const requestA = buildRequest(`${IPV6_PREFIX}::101`);
      const requestB = buildRequest(`${IPV6_PREFIX}::102`);

      for (let i = 0; i < LIMIT; i += 1) {
        await expect(guard.canActivate(buildContext(requestA))).resolves.toBe(true);
      }
      await expect(guard.canActivate(buildContext(requestA))).rejects.toBeInstanceOf(ThrottlerException);

      // addrB shares the /64 bucket now, so it must be blocked as well
      await expect(guard.canActivate(buildContext(requestB))).rejects.toBeInstanceOf(ThrottlerException);
    });

    it('keeps distinct IPv4 clients in independent buckets', async () => {
      const requestA = buildRequest('10.0.0.1');
      const requestB = buildRequest('10.0.0.2');

      for (let i = 0; i < LIMIT; i += 1) {
        await expect(guard.canActivate(buildContext(requestA))).resolves.toBe(true);
      }
      await expect(guard.canActivate(buildContext(requestA))).rejects.toBeInstanceOf(ThrottlerException);

      // a different IPv4 address must not inherit A's exhausted bucket
      await expect(guard.canActivate(buildContext(requestB))).resolves.toBe(true);
    });
  });
});
