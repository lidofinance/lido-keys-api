import { Global, Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { CuratedModuleService } from './curated-module.service';
import { CommunityModuleService } from './community-module.service';
import { StakingRouterService } from './staking-router.service';

@Global()
@Module({
  imports: [StorageModule],
  providers: [CuratedModuleService, CommunityModuleService, StakingRouterService],
  exports: [CuratedModuleService, CommunityModuleService, StakingRouterService],
})
export class StakingRouterModule {}
