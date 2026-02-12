import { Provider } from '@nestjs/common';
import { LidoLocator, LidoLocator__factory } from 'generated';
import { ExecutionProvider } from '../execution-provider';
import { ConfigService } from '../config';
import { Chain } from '../config/interfaces';
import { LIDO_LOCATOR_CONTRACT_TOKEN } from './tokens';

export const LIDO_LOCATOR_CONTRACT_ADDRESSES: Partial<Record<Chain, string>> = {
  [Chain.Mainnet]: '0xC1d0b3DE6792Bf6b4b37EccdcC24e45978Cfd2Eb',
  [Chain.Sepolia]: '0x8f6254332f69557A72b0DA2D5F0Bc07d4CA991E7',
  [Chain.Hoodi]: '0xe2EF9536DAAAEBFf5b1c130957AB3E80056b06D8',
};

export const LidoLocatorProvider: Provider = {
  provide: LIDO_LOCATOR_CONTRACT_TOKEN,
  useFactory: (provider: ExecutionProvider, config: ConfigService): LidoLocator => {
    const chainId = config.get('CHAIN_ID');
    const knownAddress = LIDO_LOCATOR_CONTRACT_ADDRESSES[chainId];
    const devnetAddress = config.get('LIDO_LOCATOR_DEVNET_ADDRESS');

    const address = knownAddress || devnetAddress;

    if (!address) {
      throw new Error(`No LidoLocator address for chain ${chainId}. Set LIDO_LOCATOR_DEVNET_ADDRESS env variable.`);
    }

    return LidoLocator__factory.connect(address, provider);
  },
  inject: [ExecutionProvider, ConfigService],
};
