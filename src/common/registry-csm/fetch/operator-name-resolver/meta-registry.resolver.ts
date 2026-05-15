/* eslint-disable @typescript-eslint/no-explicit-any */
import { Inject, Injectable } from '@nestjs/common';
import { Cmv2, MetaRegistry } from 'generated';
import { CMV2_CONTRACT_TOKEN, META_REGISTRY_CONTRACT_TOKEN, ContractFactoryFn } from 'common/contracts';
import { CallOverrides } from '../interfaces/overrides.interface';
import { OperatorNameResolver } from './operator-name.resolver';

@Injectable()
export class MetaRegistryNameResolver implements OperatorNameResolver {
  private metaRegistryByModule = new Map<string, string>();

  constructor(
    @Inject(CMV2_CONTRACT_TOKEN) private readonly connectCmv2: ContractFactoryFn<Cmv2>,
    @Inject(META_REGISTRY_CONTRACT_TOKEN) private readonly connectMetaRegistry: ContractFactoryFn<MetaRegistry>,
  ) {}

  async resolve(moduleAddress: string, operatorIndex: number, overrides: CallOverrides = {}): Promise<string> {
    const metaRegistryAddress = await this.getMetaRegistryAddress(moduleAddress);
    const { name } = await this.connectMetaRegistry(metaRegistryAddress).getOperatorMetadata(
      operatorIndex,
      overrides as any,
    );
    return name;
  }

  private async getMetaRegistryAddress(moduleAddress: string): Promise<string> {
    const key = moduleAddress.toLowerCase();
    const cached = this.metaRegistryByModule.get(key);
    if (cached) return cached;

    const address = await this.connectCmv2(moduleAddress).META_REGISTRY();
    this.metaRegistryByModule.set(key, address);
    return address;
  }
}
