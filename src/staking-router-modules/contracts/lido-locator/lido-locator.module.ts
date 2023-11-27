import { Global, Module } from '@nestjs/common';
import { LidoLocatorService } from './lido-locator.service';
import { LidoLocatorContractModule } from '@lido-nestjs/contracts';
// TODO: maybe ../../../ shows us that we need to move execution-provider on level up
import { ExecutionProvider } from '../../../common/execution-provider';

@Global()
@Module({
  imports: [
    LidoLocatorContractModule.forRootAsync({
      inject: [ExecutionProvider],
      async useFactory(provider) {
        return { provider };
      },
    }),
  ],
  providers: [LidoLocatorService],
  exports: [LidoLocatorService],
})
export class LidoLocatorModule {}
