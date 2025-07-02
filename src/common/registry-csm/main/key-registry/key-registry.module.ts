import { DynamicModule, Module } from '@nestjs/common';
import { RegistryModuleSyncOptions, RegistryModuleAsyncOptions } from '../interfaces/module.interface';
import { CSMKeyRegistryService } from './key-registry.service';
import { RegistryStorageModule } from '../../../registry/storage/registry-storage.module';
import { RegistryFetchModule } from '../../fetch/registry-fetch.module';
import { REGISTRY_GLOBAL_OPTIONS_TOKEN } from '../constants';

@Module({
  imports: [RegistryStorageModule],
  providers: [CSMKeyRegistryService],
  exports: [CSMKeyRegistryService, RegistryStorageModule],
})
export class CSMKeyRegistryModule {
  static forRoot(options?: RegistryModuleSyncOptions): DynamicModule {
    return {
      global: true,
      ...this.forFeature(options),
    };
  }

  static forRootAsync(options: RegistryModuleAsyncOptions): DynamicModule {
    return {
      global: true,
      ...this.forFeatureAsync(options),
    };
  }

  static forFeature(options?: RegistryModuleSyncOptions): DynamicModule {
    return {
      module: CSMKeyRegistryModule,
      imports: [...(options?.imports || []), RegistryFetchModule.forFeature(options)],
      providers: [
        {
          provide: REGISTRY_GLOBAL_OPTIONS_TOKEN,
          useValue: options,
        },
      ],
      exports: [RegistryFetchModule],
    };
  }

  public static forFeatureAsync(options: RegistryModuleAsyncOptions): DynamicModule {
    return {
      module: CSMKeyRegistryModule,
      imports: [...(options.imports || []), RegistryFetchModule.forFeatureAsync(options)],
      providers: [
        {
          provide: REGISTRY_GLOBAL_OPTIONS_TOKEN,
          useFactory: options.useFactory,
          inject: options.inject,
        },
      ],
      exports: [RegistryFetchModule],
    };
  }
}
