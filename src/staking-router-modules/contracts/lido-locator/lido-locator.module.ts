import { Global, Module } from '@nestjs/common';
import { LidoLocatorService } from './lido-locator.service';
import { LidoLocatorContractModule } from '@lido-nestjs/contracts';
import { ExecutionProvider } from '../../../common/execution-provider';
import { ConfigModule, ConfigService } from 'common/config';

@Global()
@Module({
  imports: [
    ConfigModule,
    LidoLocatorContractModule.forRootAsync({
      inject: [ExecutionProvider, ConfigService],
      async useFactory(provider, configService: ConfigService) {
        return { provider, address: configService.get('LIDO_LOCATOR_DEVNET_ADDRESS') };
      },
    }),
  ],
  providers: [LidoLocatorService],
  exports: [LidoLocatorService],
})
export class LidoLocatorModule {}
