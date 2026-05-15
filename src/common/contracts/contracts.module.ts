import { Global, Module } from '@nestjs/common';
import { LidoLocatorProvider } from './locator.provider';
import { StakingRouterProvider } from './staking-router.provider';
import { RegistryProvider } from './registry.provider';
import { CsmProvider } from './csm.provider';
import { Cmv2Provider } from './cmv2.provider';
import { MetaRegistryProvider } from './meta-registry.provider';
import {
  LIDO_LOCATOR_CONTRACT_TOKEN,
  STAKING_ROUTER_CONTRACT_TOKEN,
  REGISTRY_CONTRACT_TOKEN,
  CSM_CONTRACT_TOKEN,
  CMV2_CONTRACT_TOKEN,
  META_REGISTRY_CONTRACT_TOKEN,
} from './tokens';

@Global()
@Module({
  providers: [
    LidoLocatorProvider,
    StakingRouterProvider,
    RegistryProvider,
    CsmProvider,
    Cmv2Provider,
    MetaRegistryProvider,
  ],
  exports: [
    LIDO_LOCATOR_CONTRACT_TOKEN,
    STAKING_ROUTER_CONTRACT_TOKEN,
    REGISTRY_CONTRACT_TOKEN,
    CSM_CONTRACT_TOKEN,
    CMV2_CONTRACT_TOKEN,
    META_REGISTRY_CONTRACT_TOKEN,
  ],
})
export class ContractsModule {}
