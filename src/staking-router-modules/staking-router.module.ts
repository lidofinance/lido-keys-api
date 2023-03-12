import { Global, Module } from '@nestjs/common';
import { ExecutionProvider } from 'common/execution-provider';
import { KeyRegistryModule } from '@lido-nestjs/registry';
import { CuratedModuleService } from './curated-module.service';

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
  providers: [CuratedModuleService],
  exports: [CuratedModuleService],
})
export class StakingRouterModule {}
