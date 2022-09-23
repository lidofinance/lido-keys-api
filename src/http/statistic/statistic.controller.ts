import { Controller, Get, Version } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { StatisticService } from './statistic.service';
import { Statistic } from './entities';

@Controller('statistic')
@ApiTags('Example')
export class StatisticController {
  constructor(protected readonly statisticService: StatisticService) {}

  @Version('1')
  @Get('/')
  @ApiResponse({
    status: 200,
    description: 'Example statistic',
    type: Statistic,
  })
  async statisticV1(): Promise<Statistic> {
    return this.statisticService.statistic();
  }

  @Version('2')
  @Get('/')
  @ApiResponse({
    status: 200,
    description: 'Example statistic',
    type: Statistic,
  })
  async statisticV2(): Promise<Statistic> {
    return this.statisticService.statistic();
  }
}
