import { Global, Module } from '@nestjs/common';
import { ExecutionProvider } from 'common/execution-provider';
import { KeyRegistryModule } from 'common/registry';
import { CuratedModuleService } from './curated-module.service';
import { StakingRouterService } from './staking-router.service';

@Global()
@Module({
  imports: [
    KeyRegistryModule.forFeatureAsync({
      inject: [ExecutionProvider],
      async useFactory(provider) {
        return { provider };
      },
    }),
  ],
  providers: [CuratedModuleService, StakingRouterService],
  exports: [CuratedModuleService, StakingRouterService],
})
export class StakingRouterModule {}
