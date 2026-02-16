import { Global, Module } from '@nestjs/common';
import { LidoLocatorService } from './lido-locator.service';

@Global()
@Module({
  providers: [LidoLocatorService],
  exports: [LidoLocatorService],
})
export class LidoLocatorModule {}
