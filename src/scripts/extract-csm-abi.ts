import * as fs from 'fs';

export const getCSMArtifact = () => {
  const artifact = JSON.parse(fs.readFileSync('src/scripts/CSModule.json', 'utf-8'));
  return artifact;
};
const PARTS = [
  'getNodeOperatorIsActive',
  'getNodeOperator',
  'getSigningKey',
  'getNonce',
  'getNodeOperatorsCount',
  'getSigningKeysWithSignatures',
  'addNodeOperatorETH',
  'activatePublicRelease',
  'grantRole',
  'MODULE_MANAGER_ROLE',
  'decreaseVettedSigningKeysCount',
  'STAKING_ROUTER_ROLE',
  'NodeOperatorAdded',
  'RESUME_ROLE',
  'resume',
  'NodeOperatorRewardAddressChanged',
];
export const getCSMAbi = () => {
  const abi = getCSMArtifact();

  return abi.filter((node) => PARTS.includes(node.name) || node.type === 'error');
};

fs.writeFileSync(
  './src/staking-router-modules/contracts/abi/csm.json',
  JSON.stringify(getCSMAbi(), null, '\t'),
  'utf-8',
);
