import { Module } from '@nestjs/common';
import { LoggerModule } from 'common/logger';
import { StakingRouterModule } from 'staking-router-modules';
import { SRModulesOperatorsController } from './sr-modules-operators.controller';
import { SRModulesOperatorsService } from './sr-modules-operators.service';

@Module({
  imports: [LoggerModule, StakingRouterModule],
  controllers: [SRModulesOperatorsController],
  providers: [SRModulesOperatorsService],
})
export class SRModulesOperatorsModule {}
