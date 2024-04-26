import { getSigningKeysWithSignatures } from './csm-lib';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
dotenv.config();

const b = async () => {
  const provider = new ethers.providers.JsonRpcProvider(process.env.CSM_NODE_TEST_PROVIDER_URL);
  const keys = await getSigningKeysWithSignatures(provider, 0, 0, 1);
  console.log(keys);
};

b().catch(console.error);
