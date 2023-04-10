import { ethers } from 'ethers';
import yargs from 'yargs';
import fetch from 'node-fetch';
import * as fs from 'fs';

const red = '\x1b[31m';
const green = '\x1b[32m';
const reset = '\x1b[0m';

// Define the command line arguments
const argv = yargs(process.argv.slice(2)).options({
  contractAddress: { type: 'string', demandOption: true },
  contractAbiPath: { type: 'string', demandOption: true },
  elProviderUrl: { type: 'string', demandOption: true },
  baseUrl: { type: 'string', demandOption: true },
}).argv;

// Define the URL for the HTTP API request
const baseUrl = argv.baseUrl.replace(/\/$/, '');
const moduleId = 1;
const urlModuleOperatorsKeys = `${baseUrl}/v1/modules/${moduleId}/operators/keys`;

// Create an ethers provider to connect to the Goerli network
const provider = new ethers.providers.JsonRpcProvider(argv.elProviderUrl);
// fix block number we check state
const latestBlockNumber = provider.getBlockNumber().then((blockNumber) => {
  console.log('Latest block number:', blockNumber);
});

// Create an instance of the Node Operators Registry Lido contract
const contractAbi = JSON.parse(fs.readFileSync(argv.contractAbiPath, 'utf8'));
const contract = new ethers.Contract(argv.contractAddress, contractAbi, provider);

async function checkMeta({ nonce }) {
  const keyOpIndex = await contract.getKeysOpIndex({ blockTag: latestBlockNumber });
  if (nonce != keyOpIndex) {
    console.error(
      `${red}keyOpIndex different in contract and API. contract ${keyOpIndex}, api" ${nonce}. Repeat test later.${reset}`,
    );
    process.exit(1);
  }
}

// Define the async function to read keys for each operator and compare them with the keys from the HTTP API
async function compareKeysWithAPI() {
  try {
    // Get all keys from the HTTP API
    const response = await fetch(urlModuleOperatorsKeys);

    if (!response.ok) {
      console.error(
        `${red}Request /v1/modules/${moduleId}/operators/keys failed with status ${response.status}${reset}`,
      );
      return;
    }

    const {
      data: { keys: apiKeys, operators: apiOperators, module },
      meta: { elBlockSnapshot },
    } = await response.json();

    checkMeta(module);

    // Get all operators and all keys for operators from contract
    const operatorsCount = await contract.getNodeOperatorsCount({ blockTag: latestBlockNumber });
    console.log(`Operators count in contract is ${operatorsCount}`);

    //check api has the same number of operators
    if (operatorsCount == apiOperators.length) {
      console.log('API has the same number of operators');
    } else {
      console.log(`Ohh, no! API has different number of operators ${apiOperators.length}`);
    }

    const operators = await Promise.all(
      Array.from({ length: operatorsCount }, (_, index) =>
        contract.getNodeOperator(index, { blockTag: latestBlockNumber }),
      ),
    );

    // Compare the keys for each operator with the keys from the HTTP API
    for (let i = 0; i < operators.length; i++) {
      console.log(`Check for operator ${i + 1}/${operators.length}`);
      const operator = operators[i];
      // get keys from contract per operator
      const apiOperatorKeysTotal = apiKeys.filter((key) => key.operatorIndex === i);
      const apiOperatorsKeysUsed = apiOperatorKeysTotal.filter((key) => key.used);
      if (operator.totalSigningKeys != apiOperatorKeysTotal.length) {
        console.log(
          `Warning: totalSigningKeys number in contract ${operator.totalSigningKeys} is different than in API ${apiOperatorKeysTotal.length}.`,
        );

        return;
      }

      console.log(`totalSigningKeys number in contract ${operator.totalSigningKeys} the same as in API.`);

      // check used key number
      if (operator.usedSigningKeys != apiOperatorsKeysUsed.length) {
        console.log(
          `Warning: usedSigningKeys number in contract ${operator.usedSigningKeys} is different than in API ${apiOperatorsKeysUsed.length}.`,
        );
        return;
      }

      console.log(`usedSigningKeys number in contract ${operator.usedSigningKeys} the same as in API.`);
      console.log(`Checked for operator ${i + 1}/${operators.length}`);
    }

    console.log(`${green}Successfully finished apiAndContractKeysComparing test${reset}`);
  } catch (error) {
    console.error(`Error:`, error);
  }
}

compareKeysWithAPI();
