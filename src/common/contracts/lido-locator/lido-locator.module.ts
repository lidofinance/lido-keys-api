import { Global, Module } from '@nestjs/common';
import { LidoLocatorService } from './lido-locator.service';
// import { LidoLocatorContractModule } from '@lido-nestjs/contracts';
// import { ExecutionProvider } from 'common/execution-provider';

@Global()
@Module({
  // imports: [
  //   LidoLocatorContractModule.forRootAsync({
  //     inject: [ExecutionProvider],
  //     async useFactory(provider) {
  //       return { provider };
  //     },
  //   }),
  // ],
  providers: [LidoLocatorService],
  exports: [LidoLocatorService],
})
export class LidoLocatorModule {}
