import { Module } from '@nestjs/common';
import { KeysUpdateService } from './keys-update.service';
import { LoggerModule } from 'common/logger';
import { JobModule } from 'common/job';
import { StakingRouterFetchModule } from 'staking-router-modules/contracts';
import { ExecutionProviderModule } from 'common/execution-provider';
import { StorageModule } from 'storage/storage.module';
import { PrometheusModule } from 'common/prometheus';
import { StakingModuleUpdaterService } from './staking-module-updater.service';

@Module({
  imports: [
    LoggerModule,
    JobModule,
    StakingRouterFetchModule,
    ExecutionProviderModule,
    StorageModule,
    PrometheusModule,
  ],
  providers: [KeysUpdateService, StakingModuleUpdaterService],
  exports: [KeysUpdateService, StakingModuleUpdaterService],
})
export class KeysUpdateModule {}
