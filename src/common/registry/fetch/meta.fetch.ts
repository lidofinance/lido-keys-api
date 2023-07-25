/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@nestjs/common';
import { Registry__factory } from '@lido-nestjs/contracts';
import { CallOverrides } from './interfaces/overrides.interface';
import { ExecutionProvider } from 'common/execution-provider';

@Injectable()
export class RegistryMetaFetchService {
  constructor(protected readonly provider: ExecutionProvider) {}

  private getContract(moduleAddress: string) {
    return Registry__factory.connect(moduleAddress, this.provider);
  }

  /** fetches keys operation index */
  public async fetchKeysOpIndex(moduleAddress: string, overrides: CallOverrides = {}): Promise<number> {
    // TODO: read data from all contract that implement curated-v1-onchain type
    const bigNumber = await this.getContract(moduleAddress).getKeysOpIndex(overrides as any);
    return bigNumber.toNumber();
  }
}
