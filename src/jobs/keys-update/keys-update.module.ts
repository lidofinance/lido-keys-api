import { Global, Module } from '@nestjs/common';
import { KeysUpdateService } from './keys-update.service';
import { JobModule } from 'common/job';
import { StakingRouterFetchModule } from 'common/contracts';

@Global()
@Module({
  imports: [JobModule, StakingRouterFetchModule],
  providers: [KeysUpdateService],
  exports: [KeysUpdateService],
})
export class KeysUpdateModule {}
