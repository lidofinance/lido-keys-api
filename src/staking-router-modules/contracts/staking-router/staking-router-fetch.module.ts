import { Module } from '@nestjs/common';
import { StakingRouterFetchService } from './staking-router-fetch.service';
import { StakingModuleInterfaceModule } from '../staking-module-interface';
import { LidoLocatorModule } from '../lido-locator/lido-locator.module';

@Module({
  imports: [StakingModuleInterfaceModule, LidoLocatorModule],
  providers: [StakingRouterFetchService],
  exports: [StakingRouterFetchService],
})
export class StakingRouterFetchModule {}
