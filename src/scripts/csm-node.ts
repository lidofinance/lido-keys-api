import { createAnvil } from 'anvild';
import { ethers } from 'ethers';
import { addNodeOperator, getContract, getNodeOperator, getSigningKeysWithSignatures } from './csm-lib';
import * as dotenv from 'dotenv';
import { CSM_ADMIN, CSM_CONTRACT_ADDRESS, NO_PK, STARTUP_BLOCK } from './constants';

dotenv.config();

const b = async () => {
  const node = await createAnvil({
    anvil: {
      forkUrl: process.env.CSM_NODE_TEST_PROVIDER_URL,
      forkBlockNumber: STARTUP_BLOCK.number,
    },
  });

  const provider = new ethers.providers.JsonRpcProvider(node.host + ':' + node.port);
  const wallet = new ethers.Wallet(NO_PK, provider);

  await provider.send('anvil_setBalance', [wallet.address, ethers.utils.parseEther('320').toHexString()]);
  await provider.send('anvil_setBalance', [CSM_ADMIN, ethers.utils.parseEther('320').toHexString()]);
  await provider.send('anvil_autoImpersonateAccount', [true]);

  const signer = provider.getSigner(CSM_ADMIN);

  const csm = getContract(CSM_CONTRACT_ADDRESS, signer);
  try {
    await addNodeOperator(provider, wallet.address, 2);
    console.log('getNodeOperator:', await getNodeOperator(provider, 0));
    console.log('getSigningKeysWithSignatures:', await getSigningKeysWithSignatures(provider, 0, 0, 2));
  } catch (error: any) {
    if (!error?.error?.error?.data) {
      console.error(error);
      return;
    }
    const revertData = error.error.error.data;
    const decodedError = csm.interface.parseError(revertData);
    console.log(`Transaction failed: ${decodedError.name}`);
  }

  await node.stop();
};

b().catch(console.error);
