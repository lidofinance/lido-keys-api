import { IStakingModule__factory } from '../../../generated';
import { ExecutionProvider } from '../../../common/execution-provider';
import { Injectable } from '@nestjs/common';
import { ethers } from 'ethers';
import { BlockTag } from '../interfaces';

@Injectable()
export class StakingModuleInterfaceService {
  constructor(protected readonly provider: ExecutionProvider) {}

  public async getType(contractAddress: string, blockTag: BlockTag): Promise<string> {
    const contract = IStakingModule__factory.connect(contractAddress, this.provider);

    const type = await contract.getType({ blockTag } as any);
    return ethers.utils.parseBytes32String(type);
  }
}
