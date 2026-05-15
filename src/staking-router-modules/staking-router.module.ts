import { Global, Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { CuratedModuleService } from './curated-module.service';
import { CommunityModuleService } from './community-module.service';
import { StakingRouterService } from './staking-router.service';
import { STAKING_MODULE_TYPE } from './constants';
import {
  CsmStaticNameResolver,
  MetaRegistryNameResolver,
  OPERATOR_NAME_RESOLVERS_TOKEN,
  OperatorNameResolversConfig,
} from '../common/registry-csm/fetch/operator-name-resolver';

@Global()
@Module({
  imports: [StorageModule],
  providers: [
    CuratedModuleService,
    CommunityModuleService,
    StakingRouterService,
    CsmStaticNameResolver,
    MetaRegistryNameResolver,
    {
      provide: OPERATOR_NAME_RESOLVERS_TOKEN,
      useFactory: (csm: CsmStaticNameResolver, meta: MetaRegistryNameResolver): OperatorNameResolversConfig => ({
        [STAKING_MODULE_TYPE.COMMUNITY_ONCHAIN_V1_TYPE]: csm,
        [STAKING_MODULE_TYPE.CURATED_ONCHAIN_V2_TYPE]: meta,
      }),
      inject: [CsmStaticNameResolver, MetaRegistryNameResolver],
    },
  ],
  exports: [CuratedModuleService, CommunityModuleService, StakingRouterService, OPERATOR_NAME_RESOLVERS_TOKEN],
})
export class StakingRouterModule {}
