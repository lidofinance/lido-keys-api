import { DynamicModule, Module } from '@nestjs/common';
import {
  RegistryFetchModuleSyncOptions,
  RegistryFetchModuleAsyncOptions,
  REGISTRY_FETCH_OPTIONS_TOKEN,
} from './interfaces/module.interface';
import { RegistryOperatorFetchService } from './operator.fetch';
import { RegistryMetaFetchService } from './meta.fetch';
import { RegistryKeyBatchFetchService } from './key-batch.fetch';
import { RegistryFetchService } from './registry-fetch.service';

@Module({
  providers: [
    RegistryFetchService,
    RegistryOperatorFetchService,
    RegistryMetaFetchService,
    RegistryKeyBatchFetchService,
  ],
  exports: [RegistryFetchService, RegistryOperatorFetchService, RegistryMetaFetchService, RegistryKeyBatchFetchService],
})
export class RegistryFetchModule {
  static forRoot(options?: RegistryFetchModuleSyncOptions): DynamicModule {
    return {
      global: true,
      ...this.forFeature(options),
    };
  }

  static forRootAsync(options: RegistryFetchModuleAsyncOptions): DynamicModule {
    return {
      global: true,
      ...this.forFeatureAsync(options),
    };
  }

  static forFeature(options?: RegistryFetchModuleSyncOptions): DynamicModule {
    return {
      module: RegistryFetchModule,
      imports: [...(options?.imports || [])],
      providers: [
        {
          provide: REGISTRY_FETCH_OPTIONS_TOKEN,
          useValue: options?.keysBatchSize ? { keysBatchSize: options.keysBatchSize } : {},
        },
      ],
    };
  }

  public static forFeatureAsync(options: RegistryFetchModuleAsyncOptions): DynamicModule {
    return {
      module: RegistryFetchModule,
      imports: [...(options.imports || [])],
      providers: [
        {
          provide: REGISTRY_FETCH_OPTIONS_TOKEN,
          useFactory: options.useFactory,
          inject: options.inject,
        },
      ],
    };
  }
}
