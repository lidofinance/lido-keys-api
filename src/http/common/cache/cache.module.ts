import { createKeyv } from '@cacheable/memory';
import { ConfigModule, ConfigService } from '../../../common/config';
import { CacheModule as CacheModuleSource } from '@nestjs/cache-manager';

// The store cache-manager 5 used by default: at most 500 entries, expired ones removed on a timer. The default of
// cache-manager 6 is an unbounded Map that drops an expired entry only when it is read again, and the cache key is
// the full request URL.
export const CACHE_MAX_ENTRIES = 500;

export const createCacheStore = (ttlMs: number) =>
  createKeyv({
    ttl: ttlMs,
    lruSize: CACHE_MAX_ENTRIES,
    checkInterval: ttlMs,
    // Responses are not changed after they are cached; a clone per read and write would copy whole key lists
    useClone: false,
  });

export const CacheModule = CacheModuleSource.registerAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (configService: ConfigService) => {
    const ttl = configService.get('GLOBAL_CACHE_TTL') * 1000;
    return { ttl, stores: [createCacheStore(ttl)] };
  },
});
