import { DynamicModule, Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ConsensusMetaEntity } from './consensus-meta.entity';
import { ConsensusValidatorEntity } from './consensus-validator.entity';
import { StorageServiceInterface } from './storage.service.interface';
import { StorageService } from './storage.service';
import { StorageModuleAsyncOptions, StorageModuleSyncOptions } from './interfaces';

const entities = [ConsensusMetaEntity, ConsensusValidatorEntity];

@Module({
  imports: [
    MikroOrmModule.forFeature({
      entities,
    }),
  ],
  providers: [
    {
      provide: StorageServiceInterface,
      useClass: StorageService,
    },
  ],
  exports: [StorageServiceInterface],
})
export class StorageModule {
  public static readonly entities = entities;

  public static forRoot(options?: StorageModuleSyncOptions): DynamicModule {
    return {
      global: true,
      ...this.forFeature(options),
    };
  }

  public static forRootAsync(options: StorageModuleAsyncOptions): DynamicModule {
    return {
      global: true,
      ...this.forFeatureAsync(options),
    };
  }

  public static forFeature(options?: StorageModuleSyncOptions): DynamicModule {
    return {
      module: StorageModule,
      imports: options?.imports,
    };
  }

  public static forFeatureAsync(options: StorageModuleAsyncOptions): DynamicModule {
    return {
      module: StorageModule,
      imports: options.imports,
    };
  }
}
