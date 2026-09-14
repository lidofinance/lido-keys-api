import {
  HealthCheckService,
  MemoryHealthIndicator,
  HealthCheck,
  HealthCheckError,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipCache } from 'common/decorators/skipCache';
import { HEALTH_URL, HEALTH_READY_URL } from './health.constants';
import { HEAP_USED_THRESHOLD } from './constants';
import { StakingRouterService } from '../../staking-router-modules/staking-router.service';

const READY_DB_TIMEOUT_MS = 1000;

// SkipCache: the global interceptor caches every GET by URL, and a cached 200 kept answering
// for a probe through a whole database outage — measured before this decorator was here.
@Controller(HEALTH_URL)
@ApiExcludeController()
@SkipCache()
export class HealthController {
  constructor(
    protected health: HealthCheckService,
    protected memory: MemoryHealthIndicator,
    protected stakingRouter: StakingRouterService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([async () => this.memory.checkHeap('memoryHeap', HEAP_USED_THRESHOLD)]);
  }

  // 503 until the database answers and one meta row exists: without the second half a fresh
  // instance is Ready in seconds while holding zero keys.
  @Get(HEALTH_READY_URL)
  @HealthCheck()
  ready() {
    return this.health.check([
      async (): Promise<HealthIndicatorResult> => {
        const meta = await Promise.race([
          this.stakingRouter.getElBlockSnapshot(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('database read timed out')), READY_DB_TIMEOUT_MS),
          ),
        ]);
        if (!meta) {
          throw new HealthCheckError('no published meta yet', { registry: { status: 'down' } });
        }
        return { registry: { status: 'up' } };
      },
    ]);
  }
}
