import { Module } from '@nestjs/common';
import { StakingModuleInterfaceService } from './staking-module-interface.service';

@Module({
  providers: [StakingModuleInterfaceService],
  exports: [StakingModuleInterfaceService],
})
export class StakingModuleInterfaceModule {}
