import { Provider } from '@nestjs/common';
import { Cmv2, Cmv2__factory } from 'generated';
import { ExecutionProvider } from '../execution-provider';
import { CMV2_CONTRACT_TOKEN, ContractFactoryFn } from './tokens';

export const Cmv2Provider: Provider = {
  provide: CMV2_CONTRACT_TOKEN,
  useFactory: (provider: ExecutionProvider): ContractFactoryFn<Cmv2> => {
    return (address: string) => Cmv2__factory.connect(address, provider);
  },
  inject: [ExecutionProvider],
};
