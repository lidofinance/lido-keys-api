/* eslint-disable @typescript-eslint/no-explicit-any */
import { Inject, Injectable } from '@nestjs/common';
import { CallOverrides } from './interfaces/overrides.interface';
import { REGISTRY_CONTRACT_TOKEN, Registry } from '@lido-nestjs/contracts';
import { PrometheusService } from 'common/prometheus';

@Injectable()
export class RegistryMetaFetchService {
  constructor(
    @Inject(REGISTRY_CONTRACT_TOKEN) private contract: Registry,
    protected readonly prometheusService: PrometheusService,
  ) {}

  private getContract(moduleAddress: string) {
    return this.contract.attach(moduleAddress);
  }

  /** Fetches nonce from staking module contract */
  public async fetchStakingModuleNonce(moduleAddress: string, overrides: CallOverrides = {}): Promise<number> {
    const bigNumber = await this.getContract(moduleAddress).getNonce(overrides as any);
    this.prometheusService.totalRpcRequests.inc();
    return bigNumber.toNumber();
  }
}
