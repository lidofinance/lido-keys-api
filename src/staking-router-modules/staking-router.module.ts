import { DynamicModule, Global, Module } from '@nestjs/common';
import { ExecutionProvider } from '../common/execution-provider';
import { KeyRegistryModule } from '../common/registry';
import { StorageModule } from '../storage/storage.module';
import { CuratedModuleService } from './curated-module.service';
import { StakingRouterService } from './staking-router.service';
import { RegistryModuleAsyncOptions } from 'common/registry/main/interfaces/module.interface';

@Module({
  imports: [StorageModule],
  providers: [CuratedModuleService, StakingRouterService],
  exports: [CuratedModuleService, StakingRouterService],
})
export class StakingRouterModule {
  public static forFeatureAsync(options?: RegistryModuleAsyncOptions): DynamicModule {
    return {
      module: StakingRouterModule,
      imports: [
        KeyRegistryModule.forFeatureAsync(
          options || {
            inject: [ExecutionProvider],
            async useFactory(provider) {
              return { provider };
            },
          },
        ),
      ],
    };
  }
}
