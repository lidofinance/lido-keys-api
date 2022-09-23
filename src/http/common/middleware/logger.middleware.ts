import { Inject, Injectable, LoggerService, NestMiddleware } from '@nestjs/common';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { Request, Reply } from './interfaces';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(@Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService) {}

  use(request: Request, reply: Reply, next: () => void) {
    const { ip, method, headers, originalUrl } = request;
    const userAgent = headers['user-agent'] ?? '';

    reply.on('finish', () => {
      const { statusCode } = reply;
      const log = { method, originalUrl, statusCode, userAgent, ip };

      this.logger.log('Query', log);
    });

    next();
  }
}
