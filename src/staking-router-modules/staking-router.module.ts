import { Global, Module } from '@nestjs/common';
import { ExecutionProvider } from 'common/execution-provider';
import { KeyRegistryModule } from '@lido-nestjs/registry';
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
  providers: [StakingRouterService],
  exports: [StakingRouterService],
})
export class StakingRouterModule {}
