import { ethers } from 'ethers';
import { NodeOperatorAddedEvent } from 'generated/Csm';
import { Csm__factory } from '../generated';
import { CSM_ADD_ROLE_ADDRESS, CSM_ADMIN, CSM_CONTRACT_ADDRESS, NODE_URL, NO_PK } from './constants';

export const getProvider = () => {
  const provider = new ethers.providers.JsonRpcProvider(NODE_URL);
  return provider;
};

export const getContract = (
  address: string,
  provider: ethers.providers.JsonRpcProvider | ethers.providers.JsonRpcSigner,
) => {
  return Csm__factory.connect(address, provider);
};

export const getDefaultContract = () => {
  const provider = getProvider();
  const signer = provider.getSigner(CSM_ADD_ROLE_ADDRESS);
  const csm = getContract(CSM_CONTRACT_ADDRESS, signer);
  return csm;
};

export const keysSignatures = (keysCount: number, startIndex: number): [string, string] => {
  let keys = '0x';
  let signatures = '0x';

  for (let i = startIndex; i < startIndex + keysCount; i++) {
    const indexHex = ethers.utils.hexZeroPad(ethers.utils.hexlify([i + 1]), 2);

    const key = '0x' + '00'.repeat(48 - (indexHex.length - 2) / 2) + indexHex.slice(2);
    const sign = '0x' + '00'.repeat(96 - (indexHex.length - 2) / 2) + indexHex.slice(2);

    keys += key.slice(2);
    signatures += sign.slice(2);
  }

  if (keys.length !== 2 + keysCount * 96 || signatures.length !== 2 + keysCount * 192) {
    throw new Error('InvalidLength gen');
  }

  return [keys, signatures];
};

export const addNodeOperator = async (
  provider: ethers.providers.JsonRpcProvider,
  nodeOperatorAddress: string,
  keysCount: number,
) => {
  const BOND_SIZE = ethers.utils.parseEther('2.0');
  const [keys, signatures] = keysSignatures(keysCount, 0);

  const signer = provider.getSigner(nodeOperatorAddress);

  const csm = getContract(CSM_CONTRACT_ADDRESS, signer);
  const tx = await csm.addNodeOperatorETH(
    keysCount,
    keys,
    signatures,
    CSM_ADD_ROLE_ADDRESS,
    CSM_ADD_ROLE_ADDRESS,
    [],
    CSM_ADD_ROLE_ADDRESS,
    {
      // TODO: fix to getBondAmountByKeysCount
      value: BOND_SIZE.mul(keysCount),
    },
  );

  await tx.wait();
};

export const getNodeOperator = async (provider: ethers.providers.JsonRpcProvider, noId: number) => {
  const csm = getContract(CSM_CONTRACT_ADDRESS, provider);
  return { ...formatContractResponse(await csm.getNodeOperator(noId)), nodeOperatorId: noId };
};

export const watchForNewOperator = async (blockNumber: number) => {
  const csm = getDefaultContract();
  const fromBlockNumber = blockNumber;
  const toBlockNumber = blockNumber + 10_000;
  const nodeOperatorAddedFilter = csm.filters['NodeOperatorAdded']();

  let nodeOperatorAddedEvents: NodeOperatorAddedEvent[] = [];
  while (true) {
    nodeOperatorAddedEvents = await csm.queryFilter(nodeOperatorAddedFilter, fromBlockNumber, toBlockNumber);
    if (nodeOperatorAddedEvents.length) break;
    await new Promise((res) => setTimeout(res, 1000));
  }
  const res: any[] = [];
  for (const no of nodeOperatorAddedEvents) {
    res.push(await getNodeOperator(getProvider(), no.args.nodeOperatorId.toNumber()));
  }
  return res;
};

export const addAndLogNodeOperator = async (
  provider: ethers.providers.JsonRpcProvider,
  nodeOperatorAddress: string,
  keysCount: number,
) => {
  const { number: blockNumber } = await getProvider().getBlock('latest');
  await addNodeOperator(provider, nodeOperatorAddress, keysCount);
  const nodeOperators = await watchForNewOperator(blockNumber + 1);
  console.log('Node Operator:');
  console.log(nodeOperators);
  console.log('Node Operator Keys:');
  for (const no of nodeOperators) {
    console.log(await getSigningKeysWithSignatures(provider, no.nodeOperatorId, 0, keysCount));
  }
};

export const getSigningKeysWithSignatures = async (
  provider: ethers.providers.JsonRpcProvider,
  noId: number,
  startIndex: number,
  keysCount: number,
) => {
  const csm = getContract(CSM_CONTRACT_ADDRESS, provider);
  return await csm.getSigningKeysWithSignatures(noId, startIndex, keysCount);
};

export const grantAllRoles = async (addr: string) => {
  const csm = getDefaultContract();

  await csm.grantRole(await csm.MODULE_MANAGER_ROLE(), addr);
  await csm.grantRole(await csm.STAKING_ROUTER_ROLE(), addr);
  await csm.grantRole(await csm.RESUME_ROLE(), addr);
};

export const activatePublicRelease = async () => {
  const csm = getDefaultContract();

  await grantAllRoles(CSM_ADD_ROLE_ADDRESS);
  await csm.activatePublicRelease();
};

export const run = async <CB extends () => void>(cb: CB) => {
  const csm = getDefaultContract();
  const provider = getProvider();
  const wallet = new ethers.Wallet(NO_PK, provider);

  await provider.send('anvil_setBalance', [wallet.address, ethers.utils.parseEther('320').toHexString()]);
  await provider.send('anvil_setBalance', [CSM_ADMIN, ethers.utils.parseEther('320').toHexString()]);
  await provider.send('anvil_setBalance', [CSM_ADD_ROLE_ADDRESS, ethers.utils.parseEther('320').toHexString()]);

  await provider.send('anvil_autoImpersonateAccount', [true]);

  try {
    await cb();
  } catch (error: any) {
    if (!error?.error?.error?.data) {
      console.error(error);
      return;
    }
    const revertData = error.error.error.data;
    const decodedError = csm.interface.parseError(revertData);
    console.error(`Transaction failed: ${decodedError.name}`);
  }
};

const formatContractResponse = (response: any) => {
  return Object.entries(response)
    .filter(([key]) => isNaN(key as any))
    .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});
};
