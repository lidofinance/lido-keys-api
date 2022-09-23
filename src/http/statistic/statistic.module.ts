import { Module } from '@nestjs/common';
import { LoggerModule } from 'common/logger';
import { StatisticController } from './statistic.controller';
import { StatisticService } from './statistic.service';

@Module({
  imports: [LoggerModule],
  controllers: [StatisticController],
  providers: [StatisticService],
})
export class StatisticModule {}
