import { Global, Module } from '@nestjs/common';
import { StakingRouterFetchService } from './staking-router-fetch';
import { StakingRouterContractModule } from '@lido-nestjs/contracts';
import { ExecutionProvider } from 'common/execution-provider';
import { IStakingModule } from 'common/contracts/i-staking-module';

@Global()
@Module({
  imports: [
    StakingRouterContractModule.forRootAsync({
      inject: [ExecutionProvider],
      async useFactory(provider) {
        return { provider };
      },
    }),
    IStakingModule,
  ],
  providers: [StakingRouterFetchService],
  exports: [StakingRouterFetchService],
})
export class StakingRouterFetchModule {}
