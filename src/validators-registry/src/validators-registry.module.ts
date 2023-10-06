import { DynamicModule, Module } from '@nestjs/common';
import {
  ValidatorsRegistryModuleSyncOptions,
  ValidatorsRegistryModuleAsyncOptions,
  ValidatorsRegistryInterface,
} from './interfaces';
import { StorageModule } from './storage/';
import { ValidatorsRegistry } from './validators-registry';

@Module({
  providers: [
    {
      provide: ValidatorsRegistryInterface,
      useClass: ValidatorsRegistry,
    },
  ],
  exports: [ValidatorsRegistryInterface],
  imports: [StorageModule],
})
export class ValidatorsRegistryModule {
  static forRoot(options?: ValidatorsRegistryModuleSyncOptions): DynamicModule {
    return {
      global: true,
      ...this.forFeature(options),
    };
  }

  static forRootAsync(
    options: ValidatorsRegistryModuleAsyncOptions,
  ): DynamicModule {
    return {
      global: true,
      ...this.forFeatureAsync(options),
    };
  }

  static forFeature(
    options?: ValidatorsRegistryModuleSyncOptions,
  ): DynamicModule {
    return {
      module: ValidatorsRegistryModule,
      imports: options?.imports,
    };
  }

  public static forFeatureAsync(
    options: ValidatorsRegistryModuleAsyncOptions,
  ): DynamicModule {
    return {
      module: ValidatorsRegistryModule,
      imports: options.imports,
    };
  }
}
