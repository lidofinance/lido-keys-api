/* eslint-disable @typescript-eslint/no-explicit-any */
import { ModuleMetadata } from '@nestjs/common';
import { RegistryFetchOptions } from '../../fetch/interfaces/module.interface';

export interface RegistryOptions extends RegistryFetchOptions {
  subscribeInterval?: string;
}

export interface RegistryModuleSyncOptions extends Pick<ModuleMetadata, 'imports'>, RegistryOptions {}

export interface RegistryModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useFactory: (...args: any[]) => Promise<RegistryOptions>;
  inject?: any[];
}
