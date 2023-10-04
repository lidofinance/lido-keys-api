import { LidoLocator, LIDO_LOCATOR_CONTRACT_TOKEN } from '@lido-nestjs/contracts';
import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { BlockTag } from '../interfaces';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { ConfigService } from '../../../common/config';

@Injectable()
export class LidoLocatorService {
  constructor(
    @Inject(LIDO_LOCATOR_CONTRACT_TOKEN) protected readonly contract: LidoLocator,
    @Inject(LOGGER_PROVIDER) protected readonly loggerService: LoggerService,
    protected readonly config: ConfigService,
  ) {}

  getContract() {
    const lidoLocatorAddress = this.config.get('LIDO_LOCATOR_ADDRESS');

    if (lidoLocatorAddress) {
      return this.contract.attach(lidoLocatorAddress);
    }

    return this.contract;
  }

  async getStakingRouter(blockTag: BlockTag) {
    // if set address via attach this.contract.address will still have the same address
    this.loggerService.log('Contract locator address', this.getContract().address);
    return await this.getContract().stakingRouter({ blockTag } as any);
  }
}
