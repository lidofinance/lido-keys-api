import { ethers } from 'ethers';
import { NO_PK } from './constants';
import { addAndLogNodeOperator, getProvider, run } from './csm-lib';

run(async () => {
  const provider = getProvider();
  const wallet = new ethers.Wallet(NO_PK, provider);

  await addAndLogNodeOperator(provider, wallet.address, 1);
});
