/* eslint-disable @typescript-eslint/no-explicit-any */
import { ModuleMetadata } from '@nestjs/common';

export interface RegistryStorageOptions {}

export interface RegistryStorageModuleSyncOptions extends Pick<ModuleMetadata, 'imports'>, RegistryStorageOptions {}

export interface RegistryStorageModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useFactory: (...args: any[]) => Promise<RegistryStorageOptions>;
  inject?: any[];
}
