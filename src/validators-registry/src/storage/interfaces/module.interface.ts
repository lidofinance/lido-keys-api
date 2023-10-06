/* eslint-disable @typescript-eslint/no-explicit-any */
import { ModuleMetadata } from '@nestjs/common';

export interface StorageOptions {}

export interface StorageModuleSyncOptions extends Pick<ModuleMetadata, 'imports'>, StorageOptions {}

export interface StorageModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useFactory: (...args: any[]) => Promise<StorageOptions>;
  inject?: any[];
}
