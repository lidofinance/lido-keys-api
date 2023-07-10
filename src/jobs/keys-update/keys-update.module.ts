import { Module } from '@nestjs/common';
import { KeysUpdateService } from './keys-update.service';
import { LoggerModule } from 'common/logger';
import { JobModule } from 'common/job';
import { StakingRouterModule } from 'staking-router-modules';

@Module({
  imports: [LoggerModule, JobModule, StakingRouterModule],
  providers: [KeysUpdateService],
  exports: [KeysUpdateService],
})
export class KeysUpdateModule {}
