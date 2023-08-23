import { Module } from '@nestjs/common';
import { LoggerModule } from 'common/logger';
import { StakingRouterModule } from 'staking-router-modules';
import { ValidatorsModule } from 'validators';
import { SRModulesValidatorsController } from './sr-modules-validators.controller';
import { SRModulesValidatorsService } from './sr-modules-validators.service';

@Module({
  imports: [LoggerModule, StakingRouterModule.forFeatureAsync(), ValidatorsModule],
  providers: [SRModulesValidatorsService],
  controllers: [SRModulesValidatorsController],
})
export class SRModulesValidatorsModule {}
