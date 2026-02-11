import { Global, Module } from '@nestjs/common';
import { StakingRouterProvider } from './staking-router.provider';
import { RegistryProvider } from './registry.provider';
import { CsmProvider } from './csm.provider';
import { STAKING_ROUTER_CONTRACT_TOKEN, REGISTRY_CONTRACT_TOKEN, CSM_CONTRACT_TOKEN } from './tokens';

@Global()
@Module({
  providers: [StakingRouterProvider, RegistryProvider, CsmProvider],
  exports: [STAKING_ROUTER_CONTRACT_TOKEN, REGISTRY_CONTRACT_TOKEN, CSM_CONTRACT_TOKEN],
})
export class ContractsModule {}
