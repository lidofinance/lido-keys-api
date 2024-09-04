/* eslint-disable @typescript-eslint/no-explicit-any */
import { ModuleMetadata } from '@nestjs/common';
import { Signer } from 'ethers';
import { Provider } from '@ethersproject/providers';

export const REGISTRY_FETCH_OPTIONS_TOKEN = Symbol('registryFetchOptionsToken');

export interface RegistryFetchOptions {
  registryAddress?: string;
  lidoAddress?: string;
  provider?: Provider | Signer;
  keysBatchSize?: number;
  multicallEnable?: boolean;
  multicallBatchSize?: number;
}

export interface RegistryFetchModuleSyncOptions extends Pick<ModuleMetadata, 'imports'>, RegistryFetchOptions {}

export interface RegistryFetchModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useFactory: (...args: any[]) => Promise<RegistryFetchOptions>;
  inject?: any[];
}
