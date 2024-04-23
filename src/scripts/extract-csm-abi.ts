import * as fs from 'fs';

export const getCSMArtifact = () => {
  const artifact = JSON.parse(fs.readFileSync('src/scripts/CSModule.json', 'utf-8'));
  return artifact;
};

export const getCSMAbi = () => {
  const { abi } = getCSMArtifact();
  return abi;
};

fs.writeFileSync(
  './src/staking-router-modules/contracts/abi/csm.json',
  JSON.stringify(getCSMAbi(), null, '\t'),
  'utf-8',
);
