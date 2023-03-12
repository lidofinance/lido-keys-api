import { Global, Module } from '@nestjs/common';
import { StakingRouterFetchService } from './staking-router-fetch.service';
import { IStakingModule } from 'common/contracts/i-staking-module';
import { LidoLocatorModule } from 'common/contracts/lido-locator/lido-locator.module';

@Global()
@Module({
  imports: [IStakingModule, LidoLocatorModule],
  providers: [StakingRouterFetchService],
  exports: [StakingRouterFetchService],
})
export class StakingRouterFetchModule {}
