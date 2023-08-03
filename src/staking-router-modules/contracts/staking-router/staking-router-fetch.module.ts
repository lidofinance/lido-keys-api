import { Module } from '@nestjs/common';
import { StakingRouterFetchService } from './staking-router-fetch.service';
import { StakingModuleInterfaceModule } from 'staking-router-modules/contracts/staking-module-interface';
import { LidoLocatorModule } from 'staking-router-modules/contracts/lido-locator/lido-locator.module';

@Module({
  imports: [StakingModuleInterfaceModule, LidoLocatorModule],
  providers: [StakingRouterFetchService],
  exports: [StakingRouterFetchService],
})
export class StakingRouterFetchModule {}
