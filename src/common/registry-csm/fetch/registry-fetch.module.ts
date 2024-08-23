import { DynamicModule, Module } from '@nestjs/common';
import { LidoContractModule, RegistryContractModule } from '@lido-nestjs/contracts';
import {
  RegistryFetchModuleSyncOptions,
  RegistryFetchModuleAsyncOptions,
  REGISTRY_FETCH_OPTIONS_TOKEN,
} from './interfaces/module.interface';
import { RegistryOperatorFetchService } from './operator.fetch';
import { RegistryMetaFetchService } from './meta.fetch';
import { RegistryKeyBatchFetchService } from './key-batch.fetch';
import { RegistryFetchService } from './registry-fetch.service';
import { MulticallModule } from 'common/contracts/multicall.module';

@Module({
  imports: [MulticallModule],
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
      imports: [
        ...(options?.imports || []),
        LidoContractModule.forFeature({
          address: options?.lidoAddress,
          provider: options?.provider,
        }),
        RegistryContractModule.forFeature({
          address: options?.registryAddress,
          provider: options?.provider,
        }),
      ],
      providers: [
        {
          provide: REGISTRY_FETCH_OPTIONS_TOKEN,
          useValue: options?.keysBatchSize ? { keysBatchSize: options.keysBatchSize } : {},
        },
      ],
      exports: [LidoContractModule, RegistryContractModule],
    };
  }

  public static forFeatureAsync(options: RegistryFetchModuleAsyncOptions): DynamicModule {
    return {
      module: RegistryFetchModule,
      imports: [
        ...(options.imports || []),
        LidoContractModule.forFeatureAsync({
          async useFactory(...args) {
            const config = await options.useFactory(...args);
            const { provider, lidoAddress } = config;

            return { provider, address: lidoAddress };
          },
          inject: options.inject,
        }),
        RegistryContractModule.forFeatureAsync({
          async useFactory(...args) {
            const config = await options.useFactory(...args);
            const { provider, registryAddress } = config;

            return { provider, address: registryAddress };
          },
          inject: options.inject,
        }),
      ],
      providers: [
        {
          provide: REGISTRY_FETCH_OPTIONS_TOKEN,
          useFactory: options.useFactory,
          inject: options.inject,
        },
      ],
      exports: [LidoContractModule, RegistryContractModule],
    };
  }
}
