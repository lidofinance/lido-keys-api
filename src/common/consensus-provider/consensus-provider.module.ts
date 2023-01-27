import { ConsensusModule } from '@lido-nestjs/consensus';
import { Global, Module } from '@nestjs/common';
import { CONSENSUS_POOL_INTERVAL_MS } from './consensus-provider.constants';
import { ConsensusFetchModule } from './consensus-fetch.module';

@Global()
@Module({
  imports: [
    ConsensusModule.forRoot({
      imports: [ConsensusFetchModule],
      pollingInterval: CONSENSUS_POOL_INTERVAL_MS,
    }),
  ],
})
export class ConsensusProviderModule {}
