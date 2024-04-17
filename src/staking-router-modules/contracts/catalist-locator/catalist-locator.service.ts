import { CatalistLocator, CATALIST_LOCATOR_CONTRACT_TOKEN } from '@catalist-nestjs/contracts';
import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { BlockTag } from '../interfaces';
import { LOGGER_PROVIDER } from '@catalist-nestjs/logger';
import { ConfigService } from '../../../common/config';

@Injectable()
export class CatalistLocatorService {
  constructor(
    @Inject(CATALIST_LOCATOR_CONTRACT_TOKEN) protected readonly contract: CatalistLocator,
    @Inject(LOGGER_PROVIDER) protected readonly loggerService: LoggerService,
    protected readonly config: ConfigService,
  ) {}

  async getStakingRouter(blockTag: BlockTag) {
    // if set address via attach this.contract.address will still have the same address
    this.loggerService.log('Contract locator address', this.contract.address);
    return await this.contract.stakingRouter({ blockTag } as any);
  }
}
