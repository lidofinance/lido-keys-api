import { SetMetadata } from '@nestjs/common';

// Cache-Control: no-store for the route: no shared cache (CDN, proxy) may keep its answers.
// Independent of SkipCache, which only keeps the route out of the in-process response cache.
export const NO_STORE_KEY = 'noStore';
export const NoStore = () => SetMetadata(NO_STORE_KEY, true);
