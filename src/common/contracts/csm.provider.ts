import { Provider } from '@nestjs/common';
import { Csm, Csm__factory } from 'generated';
import { ExecutionProvider } from '../execution-provider';
import { CSM_CONTRACT_TOKEN, ContractFactoryFn } from './tokens';

export const CsmProvider: Provider = {
  provide: CSM_CONTRACT_TOKEN,
  useFactory: (provider: ExecutionProvider): ContractFactoryFn<Csm> => {
    return (address: string) => Csm__factory.connect(address, provider);
  },
  inject: [ExecutionProvider],
};
