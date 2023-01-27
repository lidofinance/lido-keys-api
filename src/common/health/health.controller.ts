import { HealthCheckService, MemoryHealthIndicator, HealthCheck } from '@nestjs/terminus';
import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { HEALTH_URL } from './health.constants';
import { HEAP_USED_THRESHOLD } from 'common/health/constants';

@Controller(HEALTH_URL)
@ApiExcludeController()
export class HealthController {
  constructor(protected health: HealthCheckService, protected memory: MemoryHealthIndicator) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([async () => this.memory.checkHeap('memoryHeap', HEAP_USED_THRESHOLD)]);
  }
}
