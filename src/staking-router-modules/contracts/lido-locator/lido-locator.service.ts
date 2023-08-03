import { LidoLocator, LIDO_LOCATOR_CONTRACT_TOKEN } from '@lido-nestjs/contracts';
import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { ExecutionProvider } from 'common/execution-provider';
import { BlockTag } from '../interfaces';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';

@Injectable()
export class LidoLocatorService {
  constructor(
    @Inject(LIDO_LOCATOR_CONTRACT_TOKEN) protected readonly contract: LidoLocator,
    protected readonly provider: ExecutionProvider,
    @Inject(LOGGER_PROVIDER) protected readonly loggerService: LoggerService,
  ) {}

  async getStakingRouter(blockTag: BlockTag) {
    this.loggerService.log('Contract locator address', this.contract.address);
    return await this.contract.stakingRouter({ blockTag } as any);
  }
}
