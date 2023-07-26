export function isValidContractAddress(address: string): boolean {
  const contractAddressRegex = /^0x[0-9a-fA-F]{40}$/;
  return contractAddressRegex.test(address);
}
