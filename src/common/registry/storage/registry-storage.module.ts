import { DynamicModule, Module } from '@nestjs/common';
import { RegistryStorageModuleSyncOptions, RegistryStorageModuleAsyncOptions } from './interfaces/module.interface';
import { RegistryStorageService } from './registry-storage.service';
import { RegistryOperatorStorageService } from './operator.storage';
import { RegistryKeyStorageService } from './key.storage';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { RegistryKey } from './key.entity';
import { RegistryOperator } from './operator.entity';
import { ConfigModule } from 'common/config';

@Module({
  imports: [
    MikroOrmModule.forFeature({
      entities: [RegistryKey, RegistryOperator],
    }),
    ConfigModule,
  ],
  providers: [RegistryStorageService, RegistryOperatorStorageService, RegistryKeyStorageService],
  exports: [RegistryStorageService, RegistryOperatorStorageService, RegistryKeyStorageService],
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
