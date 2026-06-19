import { Provider } from '@nestjs/common';
import { MetaRegistry, MetaRegistry__factory } from 'generated';
import { ExecutionProvider } from '../execution-provider';
import { META_REGISTRY_CONTRACT_TOKEN, ContractFactoryFn } from './tokens';

export const MetaRegistryProvider: Provider = {
  provide: META_REGISTRY_CONTRACT_TOKEN,
  useFactory: (provider: ExecutionProvider): ContractFactoryFn<MetaRegistry> => {
    return (address: string) => MetaRegistry__factory.connect(address, provider);
  },
  inject: [ExecutionProvider],
};
