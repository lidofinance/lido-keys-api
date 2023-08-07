import { LidoLocator, LIDO_LOCATOR_CONTRACT_TOKEN } from '@lido-nestjs/contracts';
import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { BlockTag } from '../interfaces';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { ConfigService } from 'common/config';

@Injectable()
export class LidoLocatorService {
  constructor(
    @Inject(LIDO_LOCATOR_CONTRACT_TOKEN) protected readonly contract: LidoLocator,
    @Inject(LOGGER_PROVIDER) protected readonly loggerService: LoggerService,
    protected readonly config: ConfigService,
  ) {}

  private getContract() {
    const lidoAddress = this.config.get('LIDO_LOCATOR_ADDRESS');

    if (lidoAddress) {
      return this.contract.attach(lidoAddress);
    }

    return this.contract;
  }

  async getStakingRouter(blockTag: BlockTag) {
    this.loggerService.log('Contract locator address', this.contract.address);
    return await this.getContract().stakingRouter({ blockTag } as any);
  }
}
