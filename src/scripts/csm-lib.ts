import { ethers } from 'ethers';
import { Csm__factory } from '../generated';
import { CSM_CONTRACT_ADDRESS } from './constants';

export const getContract = (
  address: string,
  provider: ethers.providers.JsonRpcProvider | ethers.providers.JsonRpcSigner,
) => {
  return Csm__factory.connect(address, provider);
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
    [],
    '0x067c49AD74D0D7cCB3b062B027bfeA8Dee943193',
    {
      value: BOND_SIZE.mul(keysCount),
    },
  );

  await tx.wait();
};

export const getNodeOperator = async (provider: ethers.providers.JsonRpcProvider, noId: number) => {
  const csm = getContract(CSM_CONTRACT_ADDRESS, provider);
  return await csm.getNodeOperator(noId);
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
