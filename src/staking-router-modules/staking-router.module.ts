import { Global, Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { CuratedModuleService } from './curated-module.service';
import { StakingRouterService } from './staking-router.service';

@Global()
@Module({
  imports: [StorageModule],
  providers: [CuratedModuleService, StakingRouterService],
  exports: [CuratedModuleService, StakingRouterService],
})
export class StakingRouterModule {}
