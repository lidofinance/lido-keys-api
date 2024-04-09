import { Global, Module } from '@nestjs/common';
import { CatalistLocatorService } from './lido-locator.service';
import { CatalistLocatorContractModule } from '@catalist-nestjs/contracts';
// TODO: maybe ../../../ shows us that we need to move execution-provider on level up
import { ExecutionProvider } from '../../../common/execution-provider';

@Global()
@Module({
  imports: [
    CatalistLocatorContractModule.forRootAsync({
      inject: [ExecutionProvider],
      async useFactory(provider) {
        return { provider };
      },
    }),
  ],
  providers: [CatalistLocatorService],
  exports: [CatalistLocatorService],
})
export class CatalistLocatorModule {}
