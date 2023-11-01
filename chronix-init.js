const { createSDK, chronix } = require('chronix');
const dotenv = require('dotenv');

dotenv.config();

async function init() {
  const sdk = await createSDK('http://localhost:8001');
  const forkUrl = process.env.CHRONIX_PROVIDER_MAINNET_URL;

  if (!forkUrl || forkUrl.length < 1) {
    throw new Error('CHRONIX_PROVIDER_MAINNET_URL is not valid');
  }

  // after in PROVIDERS_URL="http://localhost:${CHRONIX_SESSION_PORT}"
  const CHRONIX_SESSION_PORT = process.env.CHRONIX_SESSION_PORT;

  const session = await sdk.env.hardhat({
    port: CHRONIX_SESSION_PORT,
    fork: forkUrl,
    chainId: 1,
  });

  console.log('Created fork');

  // uncomment command below to reduce amount of keys and operators
  // await session.story('simple-dvt/reduce-no', {});
  const deploySimpleDVTState = await session.story('simple-dvt/deploy', {});

  console.log('Deployed simple dvt staking module');
  const simpleDvtState = deploySimpleDVTState.stakingRouterData.stakingModules[1];

  const nodeOperator = await session.story('simple-dvt/add-node-operator', {
    norAddress: simpleDvtState.stakingModuleAddress,
    name: 'simple dvt operator',
    rewardAddress: '0x' + '5'.repeat(40),
  });

  console.log('Added node operator');

  await session.story('simple-dvt/add-node-operator-keys', {
    norAddress: simpleDvtState.stakingModuleAddress,
    keysCount: 1,
    keys: '0x' + '5'.repeat(96),
    signatures: '0x' + '5'.repeat(192),
    noId: nodeOperator.nodeOperatorId,
  });

  console.log('Added keys');
}

init();
