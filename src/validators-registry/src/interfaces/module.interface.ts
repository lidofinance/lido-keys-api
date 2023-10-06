/* eslint-disable @typescript-eslint/no-explicit-any */
import { ModuleMetadata } from '@nestjs/common';

export interface ValidatorsRegistryModuleOptions {}

export interface ValidatorsRegistryModuleSyncOptions
  extends Pick<ModuleMetadata, 'imports'>,
    ValidatorsRegistryModuleOptions {}

export interface ValidatorsRegistryModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useFactory: (...args: any[]) => Promise<ValidatorsRegistryModuleOptions>;
  inject?: any[];
}
