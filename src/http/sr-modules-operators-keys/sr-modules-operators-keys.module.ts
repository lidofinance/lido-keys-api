import { Module } from '@nestjs/common';
import { LoggerModule } from 'common/logger';
import { StakingRouterModule } from 'staking-router-modules';
import { SRModulesOperatorsKeysController } from './sr-modules-operators-keys.controller';
import { SRModulesOperatorsKeysService } from './sr-modules-operators-keys.service';

@Module({
  imports: [LoggerModule, StakingRouterModule.forFeatureAsync()],
  controllers: [SRModulesOperatorsKeysController],
  providers: [SRModulesOperatorsKeysService],
})
export class SRModulesOperatorsKeysModule {}
