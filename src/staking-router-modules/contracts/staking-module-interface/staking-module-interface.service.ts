import { IStakingModule__factory } from '../../../generated';
import { ExecutionProvider } from '../../../common/execution-provider';
import { Injectable } from '@nestjs/common';
import { ethers } from 'ethers';
import { BlockTag } from '../interfaces';
import { PrometheusService } from 'common/prometheus';

@Injectable()
export class StakingModuleInterfaceService {
  constructor(
    protected readonly provider: ExecutionProvider,
    protected readonly prometheusService: PrometheusService,
  ) {}

  public async getType(contractAddress: string, blockTag: BlockTag): Promise<string> {
    const contract = IStakingModule__factory.connect(contractAddress, this.provider);

    const type = await contract.getType({ blockTag } as any);
    this.prometheusService.totalRpcRequests.inc();
    return ethers.utils.parseBytes32String(type);
  }
}
