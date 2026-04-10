/* eslint-disable @typescript-eslint/no-explicit-any */
import { ModuleMetadata } from '@nestjs/common';

export const REGISTRY_FETCH_OPTIONS_TOKEN = Symbol('registryFetchOptionsToken');

export interface RegistryFetchOptions {
  keysBatchSize?: number;
}

export interface RegistryFetchModuleSyncOptions extends Pick<ModuleMetadata, 'imports'>, RegistryFetchOptions {}

export interface RegistryFetchModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useFactory: (...args: any[]) => Promise<RegistryFetchOptions>;
  inject?: any[];
}
