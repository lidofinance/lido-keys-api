import { Provider } from '@nestjs/common';
import { StakingRouter, StakingRouter__factory } from 'generated';
import { ExecutionProvider } from '../execution-provider';
import { STAKING_ROUTER_CONTRACT_TOKEN, ContractFactoryFn } from './tokens';

export const StakingRouterProvider: Provider = {
  provide: STAKING_ROUTER_CONTRACT_TOKEN,
  useFactory: (provider: ExecutionProvider): ContractFactoryFn<StakingRouter> => {
    return (address: string) => StakingRouter__factory.connect(address, provider);
  },
  inject: [ExecutionProvider],
};
