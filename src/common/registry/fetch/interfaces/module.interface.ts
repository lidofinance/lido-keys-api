/* eslint-disable @typescript-eslint/no-explicit-any */
import { ModuleMetadata } from '@nestjs/common';
import { Signer } from 'ethers';
import { Provider } from '@ethersproject/providers';

export interface RegistryFetchOptions {
  registryAddress?: string;
  lidoAddress?: string;
  provider?: Provider | Signer;
}

export interface RegistryFetchModuleSyncOptions extends Pick<ModuleMetadata, 'imports'>, RegistryFetchOptions {}

export interface RegistryFetchModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useFactory: (...args: any[]) => Promise<RegistryFetchOptions>;
  inject?: any[];
}
