import { LidoLocator, LIDO_LOCATOR_CONTRACT_TOKEN } from '@lido-nestjs/contracts';
import { Injectable, Inject } from '@nestjs/common';
import { ExecutionProvider } from 'common/execution-provider';
import { BlockTag } from '../interfaces';

@Injectable()
export class LidoLocatorService {
  constructor(
    @Inject(LIDO_LOCATOR_CONTRACT_TOKEN) protected readonly contract: LidoLocator,
    protected readonly provider: ExecutionProvider,
  ) {}

  async getStakingRouter(blockTag: BlockTag) {
    return await this.contract.stakingRouter({ blockTag } as any);
  }
}
