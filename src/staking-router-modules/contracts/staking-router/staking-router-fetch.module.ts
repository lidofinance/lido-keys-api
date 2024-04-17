import { Module } from '@nestjs/common';
import { StakingRouterFetchService } from './staking-router-fetch.service';
import { StakingModuleInterfaceModule } from '../staking-module-interface';
import { CatalistLocatorModule } from '../catalist-locator/catalist-locator.module';
import { StakingRouterContractModule } from '@catalist-nestjs/contracts';
import { ExecutionProvider } from '../../../common/execution-provider';

@Module({
  imports: [
    StakingModuleInterfaceModule,
    CatalistLocatorModule,
    StakingRouterContractModule.forRootAsync({
      inject: [ExecutionProvider],
      async useFactory(provider) {
        return { provider };
      },
    }),
  ],
  providers: [StakingRouterFetchService],
  exports: [StakingRouterFetchService],
})
export class StakingRouterFetchModule {}
