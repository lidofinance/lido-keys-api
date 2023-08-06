/* eslint-disable @typescript-eslint/no-explicit-any */
import { Inject, Injectable } from '@nestjs/common';
// import { Registry__factory } from '@lido-nestjs/contracts';
import { CallOverrides } from './interfaces/overrides.interface';
import { ExecutionProvider } from 'common/execution-provider';
import { REGISTRY_CONTRACT_TOKEN, Registry__factory, Registry } from '@lido-nestjs/contracts';

@Injectable()
export class RegistryMetaFetchService {
  constructor(@Inject(REGISTRY_CONTRACT_TOKEN) private contract: Registry) {}

  private getContract(moduleAddress: string) {
    return this.contract.attach(moduleAddress);
    // return Registry__factory.connect(moduleAddress, this.provider);
  }

  /** fetches keys operation index */
  public async fetchKeysOpIndex(moduleAddress: string, overrides: CallOverrides = {}): Promise<number> {
    // TODO: read data from all contract that implement curated-v1-onchain type
    const bigNumber = await this.getContract(moduleAddress).getKeysOpIndex(overrides as any);
    return bigNumber.toNumber();
  }
}
