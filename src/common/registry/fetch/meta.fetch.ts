/* eslint-disable @typescript-eslint/no-explicit-any */
import { Inject, Injectable } from '@nestjs/common';
import { CallOverrides } from './interfaces/overrides.interface';
import { REGISTRY_CONTRACT_TOKEN, Registry } from '@lido-nestjs/contracts';

@Injectable()
export class RegistryMetaFetchService {
  constructor(@Inject(REGISTRY_CONTRACT_TOKEN) private contract: Registry) {}

  private getContract(moduleAddress: string) {
    return this.contract.attach(moduleAddress);
  }

  /** fetches keys operation index */
  public async fetchKeysOpIndex(moduleAddress: string, overrides: CallOverrides = {}): Promise<number> {
    const bigNumber = await this.getContract(moduleAddress).getKeysOpIndex(overrides as any);
    return bigNumber.toNumber();
  }
}
