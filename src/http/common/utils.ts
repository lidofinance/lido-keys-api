import { ethers } from 'ethers';

export function addressToChecksum(address) {
  return ethers.utils.getAddress(address);
}
