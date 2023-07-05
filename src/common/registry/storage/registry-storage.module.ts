import { DynamicModule, Module } from '@nestjs/common';
import { RegistryStorageModuleSyncOptions, RegistryStorageModuleAsyncOptions } from './interfaces/module.interface';
import { RegistryStorageService } from './registry-storage.service';
import { RegistryOperatorStorageService } from './operator.storage';
import { RegistryMetaStorageService } from './meta.storage';
import { RegistryKeyStorageService } from './key.storage';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { RegistryKey } from './key.entity';
import { RegistryOperator } from './operator.entity';
import { RegistryMeta } from './meta.entity';

@Module({
  imports: [
    MikroOrmModule.forFeature({
      entities: [RegistryKey, RegistryOperator, RegistryMeta],
    }),
  ],
  providers: [
    RegistryStorageService,
    RegistryOperatorStorageService,
    RegistryMetaStorageService,
    RegistryKeyStorageService,
  ],
  exports: [
    RegistryStorageService,
    RegistryOperatorStorageService,
    RegistryMetaStorageService,
    RegistryKeyStorageService,
  ],
})
export class RegistryStorageModule {
  static forRoot(options?: RegistryStorageModuleSyncOptions): DynamicModule {
    return {
      global: true,
      ...this.forFeature(options),
    };
  }

  static forRootAsync(options: RegistryStorageModuleAsyncOptions): DynamicModule {
    return {
      global: true,
      ...this.forFeatureAsync(options),
    };
  }

  static forFeature(options?: RegistryStorageModuleSyncOptions): DynamicModule {
    return {
      module: RegistryStorageModule,
      imports: options?.imports,
    };
  }

  public static forFeatureAsync(options: RegistryStorageModuleAsyncOptions): DynamicModule {
    return {
      module: RegistryStorageModule,
      imports: options.imports,
    };
  }
}
