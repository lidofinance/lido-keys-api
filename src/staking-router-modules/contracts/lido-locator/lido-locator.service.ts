import { LidoLocator, LIDO_LOCATOR_CONTRACT_TOKEN } from '@lido-nestjs/contracts';
import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { BlockTag } from '../interfaces';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { ConfigService } from '../../../common/config';
import { PrometheusService } from 'common/prometheus';

@Injectable()
export class LidoLocatorService {
  constructor(
    @Inject(LIDO_LOCATOR_CONTRACT_TOKEN) protected readonly contract: LidoLocator,
    @Inject(LOGGER_PROVIDER) protected readonly loggerService: LoggerService,
    protected readonly config: ConfigService,
    protected readonly prometheusService: PrometheusService,
  ) {}

  async getStakingRouter(blockTag: BlockTag) {
    const locatorENVAddress = this.config.get('LIDO_LOCATOR_DEVNET_ADDRESS');

    this.loggerService.log('Contract locator address', { contract: this.contract.address, env: locatorENVAddress });

    this.prometheusService.totalRpcRequests.inc();
    if (locatorENVAddress) {
      return await this.contract.attach(locatorENVAddress).stakingRouter({ blockTag } as any);
    }

    return await this.contract.stakingRouter({ blockTag } as any);
  }
}
