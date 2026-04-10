/* eslint-disable @typescript-eslint/no-explicit-any */
import { Inject, Injectable } from '@nestjs/common';
import { CallOverrides } from './interfaces/overrides.interface';
import { Registry } from 'generated';
import { REGISTRY_CONTRACT_TOKEN, ContractFactoryFn } from 'common/contracts';

@Injectable()
export class RegistryMetaFetchService {
  constructor(@Inject(REGISTRY_CONTRACT_TOKEN) private connectRegistry: ContractFactoryFn<Registry>) {}

  /** Fetches nonce from staking module contract */
  public async fetchStakingModuleNonce(moduleAddress: string, overrides: CallOverrides = {}): Promise<number> {
    const bigNumber = await this.connectRegistry(moduleAddress).getNonce(overrides as any);
    return bigNumber.toNumber();
  }
}
