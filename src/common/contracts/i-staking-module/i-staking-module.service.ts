import { IStakingModule__factory } from 'generated';
import { ExecutionProvider } from 'common/execution-provider';
import { Injectable } from '@nestjs/common';
import { ethers } from 'ethers';

@Injectable()
export class IStakingModuleService {
  constructor(protected readonly provider: ExecutionProvider) {}

  public async getType(contractAddress: string, blockTag: number | string): Promise<string> {
    const contract = await IStakingModule__factory.connect(contractAddress, this.provider);

    const type = await contract.getType({ blockTag });
    return ethers.utils.parseBytes32String(type);
  }
}
