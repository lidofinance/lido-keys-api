import { Global, Module } from '@nestjs/common';
import { ExecutionProvider } from 'common/execution-provider';
import { KeyRegistryModule } from '@lido-nestjs/registry';
import { CuratedModuleService } from './curated-module.service';
import { LidoLocatorModule } from 'common/contracts/lido-locator/lido-locator.module';

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
