import { Global, Module } from '@nestjs/common';
import { LidoLocatorService } from './lido-locator.service';
import { LidoLocatorContractModule } from '@lido-nestjs/contracts';
// TODO: maybe ../../../ shows us that we need to move execution-provider on level up
import { ExecutionProvider } from '../../../common/execution-provider';
import { ConfigService } from 'common/config';

@Global()
@Module({
  imports: [
    LidoLocatorContractModule.forRootAsync({
      inject: [ExecutionProvider, ConfigService],
      async useFactory(provider, configService: ConfigService) {
        console.log('address:', configService.get('LIDO_LOCATOR_DEVNET_ADDRESS'));
        return { provider, address: configService.get('LIDO_LOCATOR_DEVNET_ADDRESS') };
      },
    }),
  ],
  providers: [LidoLocatorService],
  exports: [LidoLocatorService],
})
export class LidoLocatorModule {}
