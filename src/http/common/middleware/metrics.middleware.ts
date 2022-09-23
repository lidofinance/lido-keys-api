import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Reply } from './interfaces';
import { PrometheusService } from 'common/prometheus';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(protected readonly prometheusService: PrometheusService) {}

  use(request: Request, reply: Reply, next: () => void) {
    const { method } = request;

    const endTimer = this.prometheusService.httpRequestDuration.startTimer({
      method,
    });

    reply.on('finish', () => {
      const { statusCode } = reply;
      endTimer({ statusCode });
    });

    next();
  }
}
