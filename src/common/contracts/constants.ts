import { CHAINS } from '@lido-nestjs/constants';

export const MULTICALL_CONTRACT_TOKEN = Symbol('multicallContract');

export const MULTICALL_ADDRESS = {
  [CHAINS.Mainnet]: '0xcA11bde05977b3631167028862bE2a173976CA11',
  [CHAINS.Holesky]: '0xcA11bde05977b3631167028862bE2a173976CA11',
};
