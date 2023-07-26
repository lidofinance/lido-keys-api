import { LidoLocator, LidoLocator__factory } from '@lido-nestjs/contracts/dist/generated';
import { Injectable, Inject, LoggerService } from '@nestjs/common';
// import { ExecutionProvider } from 'common/execution-provider';
import { BlockTag } from '../interfaces';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';

@Injectable()
export class LidoLocatorService {
  constructor(@Inject(LOGGER_PROVIDER) protected readonly loggerService: LoggerService) {}

  async getStakingRouter(blockTag: BlockTag) {
    // const locator = LidoLocator__factory.connect('0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9', provider);
    // this.loggerService.log('Contract locator address', this.contract.address);
    // const aaa = this.contract.attach('0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9');
    // return await locator.stakingRouter({ blockTag } as any);
  }
}
