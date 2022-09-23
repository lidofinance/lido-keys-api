import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { Statistic } from './entities';

@Injectable()
export class StatisticService {
  constructor(@Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService) {}

  statistic(): Statistic {
    this.logger.log('Statistic');

    return {
      timestamp: Number(new Date()),
    };
  }
}
