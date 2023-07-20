import { Module } from '@nestjs/common';
import { LoggerModule } from 'common/logger';
import { StakingRouterModule } from 'staking-router-modules';
import { SRModulesController } from './sr-modules.controller';
import { SRModulesService } from './sr-modules.service';

@Module({
  imports: [LoggerModule, StakingRouterModule],
  controllers: [SRModulesController],
  providers: [SRModulesService],
})
export class SRModulesModule {}
