import { LidoLocator } from 'generated';
import { LIDO_LOCATOR_CONTRACT_TOKEN } from 'common/contracts';
import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { BlockTag } from '../interfaces';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';

@Injectable()
export class LidoLocatorService {
  constructor(
    @Inject(LIDO_LOCATOR_CONTRACT_TOKEN) protected readonly contract: LidoLocator,
    @Inject(LOGGER_PROVIDER) protected readonly loggerService: LoggerService,
  ) {}

  async getStakingRouter(blockTag: BlockTag) {
    this.loggerService.log('Contract locator address', { contract: this.contract.address });

    return await this.contract.stakingRouter({ blockTag } as any);
  }
}
