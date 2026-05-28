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
import {
  CsmStaticNameResolver,
  MetaRegistryNameResolver,
  OPERATOR_NAME_RESOLVERS_TOKEN,
  OperatorNameResolversConfig,
} from './operator-name-resolver';

@Module({
  providers: [
    RegistryFetchService,
    RegistryOperatorFetchService,
    RegistryMetaFetchService,
    RegistryKeyBatchFetchService,
    CsmStaticNameResolver,
    MetaRegistryNameResolver,
    {
      provide: OPERATOR_NAME_RESOLVERS_TOKEN,
      useFactory: (csm: CsmStaticNameResolver, meta: MetaRegistryNameResolver): OperatorNameResolversConfig => ({
        // Keys match values of STAKING_MODULE_TYPE enum in staking-router-modules/constants.ts.
        // String literals are used here to avoid cross-layer import of the enum into common/.
        'community-onchain-v1': csm,
        'curated-onchain-v2': meta,
      }),
      inject: [CsmStaticNameResolver, MetaRegistryNameResolver],
    },
  ],
  exports: [
    RegistryFetchService,
    RegistryOperatorFetchService,
    RegistryMetaFetchService,
    RegistryKeyBatchFetchService,
    OPERATOR_NAME_RESOLVERS_TOKEN,
  ],
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
