/* eslint-disable @typescript-eslint/no-explicit-any */
import { Inject, Injectable } from '@nestjs/common';
import { CallOverrides } from './interfaces/overrides.interface';
import { Csm } from 'generated';
import { CSM_CONTRACT_TOKEN, ContractFactoryFn } from 'common/contracts';

@Injectable()
export class RegistryMetaFetchService {
  constructor(@Inject(CSM_CONTRACT_TOKEN) private connectCsm: ContractFactoryFn<Csm>) {}

  /** Fetches nonce from staking module contract */
  public async fetchStakingModuleNonce(moduleAddress: string, overrides: CallOverrides = {}): Promise<number> {
    const bigNumber = await this.connectCsm(moduleAddress).getNonce(overrides as any);
    return bigNumber.toNumber();
  }
}
