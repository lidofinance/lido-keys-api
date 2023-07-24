/* eslint-disable @typescript-eslint/no-explicit-any */
import { Inject, Injectable } from '@nestjs/common';
import { Registry, REGISTRY_CONTRACT_TOKEN } from '@lido-nestjs/contracts';
import { CallOverrides } from './interfaces/overrides.interface';

@Injectable()
export class RegistryMetaFetchService {
  constructor(@Inject(REGISTRY_CONTRACT_TOKEN) private registryContract: Registry) {}

  /** fetches keys operation index */
  public async fetchKeysOpIndex(overrides: CallOverrides = {}, moduleAddress: string): Promise<number> {
    // TODO: read data from all contract that implement curated-v1-onchain type
    const bigNumber = await this.registryContract.getKeysOpIndex(overrides as any);
    return bigNumber.toNumber();
  }
}
