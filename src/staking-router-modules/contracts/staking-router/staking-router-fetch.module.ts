import { Module } from '@nestjs/common';
import { StakingRouterFetchService } from './staking-router-fetch.service';
import { StakingModuleInterfaceModule } from '../staking-module-interface';
import { LidoLocatorModule } from '../lido-locator/lido-locator.module';
import { StakingRouterContractModule } from '@lido-nestjs/contracts';
import { ExecutionProvider } from '../../../common/execution-provider';
import { ConfigService } from 'common/config';
import { ethers } from 'ethers';

@Module({
  imports: [
    StakingModuleInterfaceModule,
    LidoLocatorModule,
    StakingRouterContractModule.forRootAsync({
      inject: [ExecutionProvider, ConfigService],
      async useFactory(provider, configService: ConfigService) {
        return { provider, address: '0x0000000000000000000000000000000000000000' };
      },
    }),
  ],
  providers: [StakingRouterFetchService],
  exports: [StakingRouterFetchService],
})
export class StakingRouterFetchModule {}
