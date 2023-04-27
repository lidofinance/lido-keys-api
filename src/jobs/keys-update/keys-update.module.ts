import { Module } from '@nestjs/common';
import { KeysUpdateService } from './keys-update.service';
import { LoggerModule } from 'common/logger';
import { JobModule } from 'common/job';
import { StakingRouterFetchModule } from 'common/contracts';

@Module({
  imports: [LoggerModule, JobModule, StakingRouterFetchModule],
  providers: [KeysUpdateService],
  exports: [KeysUpdateService],
})
export class KeysUpdateModule {}
