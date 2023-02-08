import { MikroORM, UseRequestContext } from '@mikro-orm/core';
import { Inject } from '@nestjs/common';
import { LOGGER_PROVIDER, LoggerService } from 'common/logger';
import { PrometheusService } from 'common/prometheus';

export class JobService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,

    protected readonly prometheusService: PrometheusService,
    protected readonly orm: MikroORM,
  ) {}

  /**
   * Wraps job with logging and metrics, isolate request context
   * @param meta - job meta
   * @param jobFn - job function
   * @returns job function call result
   */
  @UseRequestContext()
  async wrapJob<R, M extends { name: string }>(meta: M, jobFn: () => Promise<R>): Promise<R | undefined> {
    this.logger.debug?.('Job started', meta);
    const endTimer = this.prometheusService.jobDuration.startTimer({ job: meta.name });

    try {
      const result = await jobFn();
      endTimer({ result: 'success' });

      return result;
    } catch (error) {
      endTimer({ result: 'error' });
      this.logger.warn('Job terminated with an error', meta);
      this.logger.error(error);
    } finally {
      this.logger.debug?.('Job ended', meta);
    }
  }
}
