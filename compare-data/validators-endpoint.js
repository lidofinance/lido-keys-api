const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const baseEndpoint1 = process.env.KAPI_HOST_NEW_VERSION;
// Define the URLs of the endpoints you want to compare
if (baseEndpoint1.endsWith('/')) {
  baseEndpoint1 = baseEndpoint1.slice(0, -1);
}

const baseEndpoint2 = process.env.KAPI_HOST_OLD_VERSION;
// Define the URLs of the endpoints you want to compare
if (baseEndpoint2.endsWith('/')) {
  baseEndpoint2 = baseEndpoint2.slice(0, -1);
}

// Function to fetch data from an endpoint
async function fetchData(endpoint, method = 'get', data = null) {
  try {
    const response = await axios({
      method,
      url: endpoint,
      data,
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching data from ${endpoint}: ${error.message}`);
    return null;
  }
}

// Function to check the structure of the response
function checkResponseStructure(response) {
  return response && response.hasOwnProperty('data') && response.hasOwnProperty('meta');
}

// Main function to compare endpoints
async function compareEndpoints(path = '', messages = 0) {
  const endpoint1 = `${baseEndpoint1}/${path}`;
  const endpoint2 = `${baseEndpoint2}/${path}`;

  const response1 = await fetchData(endpoint1);
  const response2 = await fetchData(endpoint2);

  // Check the structure of the responses
  if (!checkResponseStructure(response1) || !checkResponseStructure(response2)) {
    console.log('The responses have an incorrect structure.');
    return;
  }

  const meta1 = response1.meta;
  const meta2 = response2.meta;

  if (meta1.clBlockSnapshot.blockHash !== meta2.clBlockSnapshot.blockHash) {
    console.log('The "blockHash" property in the "meta" field is different.');
    return;
  }

  const data1 = response1.data;
  const data2 = response2.data;

  // Sort data arrays by "key"

  if (messages) {
    data1.sort((a, b) => parseInt(a.validator_index, 10) - parseInt(b.validator_index, 10));
    data2.sort((a, b) => parseInt(a.validator_index, 10) - parseInt(b.validator_index, 10));
  } else {
    data1.sort((a, b) => a.validatorIndex - b.validatorIndex);
    data2.sort((a, b) => a.validatorIndex - b.validatorIndex);
  }

  // Check if the lists have the same length
  if (data1.length !== data2.length) {
    console.log('The lists have different lengths.');
    return;
  }

  // Compare each object in the lists
  for (let i = 0; i < data1.length; i++) {
    for (const key in data1[i]) {
      if (data1[i][key] !== data2[i][key]) {
        console.log(`Object at index ${i} is different.`);
        return;
      }
    }
  }

  console.log('The lists are equivalent.');
}

async function runComparison() {
  console.log('Comparing endpoints with prepared for exit validators:');
  await compareEndpoints('v1/modules/1/validators/validator-exits-to-prepare/10', 0);

  console.log('Comparing endpoints with exit messages:', 1);
  await compareEndpoints('v1/modules/1/validators/generate-unsigned-exit-messages/10', 1);
}

// Call the main function to start the comparison
runComparison();
