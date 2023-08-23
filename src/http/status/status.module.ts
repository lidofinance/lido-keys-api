import { Module } from '@nestjs/common';
import { LoggerModule } from 'common/logger';
import { StakingRouterModule } from 'staking-router-modules';
import { StatusController } from './status.controller';
import { StatusService } from './status.service';

@Module({
  imports: [LoggerModule, StakingRouterModule.forFeatureAsync()],
  controllers: [StatusController],
  providers: [StatusService],
})
export class StatusModule {}
