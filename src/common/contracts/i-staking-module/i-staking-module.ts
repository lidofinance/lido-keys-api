import { Module } from '@nestjs/common';
import { IStakingModuleService } from './i-staking-module.service';

@Module({
  providers: [IStakingModuleService],
  exports: [IStakingModuleService],
})
export class IStakingModule {}
