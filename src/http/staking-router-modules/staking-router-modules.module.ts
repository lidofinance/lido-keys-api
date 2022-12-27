import { Module } from '@nestjs/common';
import { LoggerModule } from 'common/logger';
import { StakingRouterModulesController } from './staking-router-modules.controller';
import { StakingRouterModulesService } from './staking-router-modules.service';

@Module({
  imports: [LoggerModule],
  controllers: [StakingRouterModulesController],
  providers: [StakingRouterModulesService],
})
export class StakingRouterModulesModule {}
