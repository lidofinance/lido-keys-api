import { Provider } from '@nestjs/common';
import { Registry, Registry__factory } from 'generated';
import { ExecutionProvider } from '../execution-provider';
import { REGISTRY_CONTRACT_TOKEN, ContractFactoryFn } from './tokens';

export const RegistryProvider: Provider = {
  provide: REGISTRY_CONTRACT_TOKEN,
  useFactory: (provider: ExecutionProvider): ContractFactoryFn<Registry> => {
    return (address: string) => Registry__factory.connect(address, provider);
  },
  inject: [ExecutionProvider],
};
