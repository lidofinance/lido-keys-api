import { Module } from '@nestjs/common';
import { LoggerModule } from 'common/logger';
import { StakingRouterModule } from 'staking-router-modules';
import { SRModulesKeysController } from './sr-modules-keys.controller';
import { SRModulesKeysService } from './sr-modules-keys.service';

@Module({
  imports: [LoggerModule, StakingRouterModule],
  controllers: [SRModulesKeysController],
  providers: [SRModulesKeysService],
})
export class SRModulesKeysModule {}
