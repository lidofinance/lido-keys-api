import { KeyvCacheableMemory } from '@cacheable/memory';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test } from '@nestjs/testing';
import { Cache, createCache } from 'cache-manager';
import { ConfigService } from 'common/config';
import { CACHE_MAX_ENTRIES, CacheModule, createCacheStore } from './cache.module';

// The way @nestjs/cache-manager builds the cache from the module options
const buildCache = (ttl: number) => {
  const keyv = createCacheStore(ttl);
  const memory = (keyv.store as KeyvCacheableMemory).store;
  return { cache: createCache({ ttl, stores: [keyv] }), memory };
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('cache store', () => {
  it('keeps at most CACHE_MAX_ENTRIES entries, evicting the least recently used', async () => {
    const { cache, memory } = buildCache(60_000);

    for (let i = 0; i <= CACHE_MAX_ENTRIES; i++) {
      await cache.set(`/v1/keys?x=${i}`, { i });
    }

    expect(memory.size).toBe(CACHE_MAX_ENTRIES);
    expect(await cache.get('/v1/keys?x=0')).toBeNull();
    expect(await cache.get(`/v1/keys?x=${CACHE_MAX_ENTRIES}`)).toEqual({ i: CACHE_MAX_ENTRIES });
  });

  it('removes expired entries without reading them', async () => {
    const { cache, memory } = buildCache(50);

    for (let i = 0; i < 10; i++) {
      await cache.set(`/v1/keys?x=${i}`, { i });
    }
    expect(memory.size).toBe(10);

    await sleep(200);

    expect(memory.size).toBe(0);
  });

  it('is the store of the cache module, with GLOBAL_CACHE_TTL as its ttl', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [CacheModule] })
      .overrideProvider(ConfigService)
      .useValue({ get: (key: string) => (key === 'GLOBAL_CACHE_TTL' ? 7 : undefined) })
      .compile();
    const [keyv] = moduleRef.get<Cache>(CACHE_MANAGER).stores;
    const memory = (keyv.store as KeyvCacheableMemory).store;

    expect(memory.lruSize).toBe(CACHE_MAX_ENTRIES);
    expect(memory.checkInterval).toBe(7000);
    expect(memory.ttl).toBe(7000);
    expect(memory.useClone).toBe(false);
  });

  it('returns the cached response itself, not a copy', async () => {
    const { cache } = buildCache(60_000);
    const response = { data: [{ key: '0x01' }] };

    await cache.set('/v1/modules/keys', response);

    expect(await cache.get('/v1/modules/keys')).toBe(response);
  });
});
