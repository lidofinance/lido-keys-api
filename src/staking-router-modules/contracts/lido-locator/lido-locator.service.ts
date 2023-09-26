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
  ) {
    const lidoLocatorAddress = this.config.get('LIDO_LOCATOR_ADDRESS');

    if (lidoLocatorAddress) {
      this.contract.attach(lidoLocatorAddress);
    }
  }

  async getStakingRouter(blockTag: BlockTag) {
    this.loggerService.log('Contract locator address', this.contract.address);
    return await this.contract.stakingRouter({ blockTag } as any);
  }
}
