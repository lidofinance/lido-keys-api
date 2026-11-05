/* eslint-disable @typescript-eslint/no-explicit-any */
import { Inject, Injectable } from '@nestjs/common';
import { utils } from 'ethers';
import { Cmv2, MetaRegistry } from 'generated';
import { CMV2_CONTRACT_TOKEN, META_REGISTRY_CONTRACT_TOKEN, ContractFactoryFn } from 'common/contracts';
import { CallOverrides } from '../interfaces/overrides.interface';
import { InvalidOperatorNameError, OperatorNameResolver } from './operator-name.resolver';

@Injectable()
export class MetaRegistryNameResolver implements OperatorNameResolver {
  constructor(
    @Inject(CMV2_CONTRACT_TOKEN) private readonly connectCmv2: ContractFactoryFn<Cmv2>,
    @Inject(META_REGISTRY_CONTRACT_TOKEN) private readonly connectMetaRegistry: ContractFactoryFn<MetaRegistry>,
  ) {}

  async resolve(moduleAddress: string, operatorIndex: number, overrides: CallOverrides = {}): Promise<string> {
    // RPC errors are thrown here and must propagate, so the update is retried instead of storing a placeholder
    const metaRegistryAddress = await this.getMetaRegistryAddress(moduleAddress, overrides);
    const metadata = await this.connectMetaRegistry(metaRegistryAddress).getOperatorMetadata(
      operatorIndex,
      overrides as any,
    );

    // ethers defers a malformed UTF-8 decode error and throws it when the field is read
    try {
      return metadata.name;
    } catch (error) {
      throw new InvalidOperatorNameError(
        `Operator ${operatorIndex} of module ${moduleAddress} has a name that can't be decoded`,
        error,
      );
    }
  }

  async namesWereChanged(moduleAddress: string, fromBlock: number, toBlock: number): Promise<boolean> {
    if (fromBlock > toBlock) {
      return false;
    }

    const metaRegistryAddress = await this.getMetaRegistryAddress(moduleAddress, { blockTag: toBlock });
    const events = await this.connectMetaRegistry(metaRegistryAddress).provider.getLogs({
      address: metaRegistryAddress,
      topics: [utils.id('OperatorMetadataSet(uint256,(string,string,bool))')],
      fromBlock,
      toBlock,
    });

    return events.length > 0;
  }

  // not cached: a module upgrade can point it to another MetaRegistry, so it is read at the requested block
  private async getMetaRegistryAddress(moduleAddress: string, overrides: CallOverrides): Promise<string> {
    return await this.connectCmv2(moduleAddress).META_REGISTRY(overrides as any);
  }
}
