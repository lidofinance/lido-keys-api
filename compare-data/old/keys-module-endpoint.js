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

function compareKeyObjects(obj1, obj2) {
  // Compare key objects excluding the "moduleAddress" field
  const strippedObj1 = { ...obj1 };
  const strippedObj2 = { ...obj2 };
  delete strippedObj1.moduleAddress;
  delete strippedObj2.moduleAddress;

  for (const key in strippedObj1) {
    if (strippedObj1[key] !== strippedObj2[key]) {
      return false;
    }
  }

  return true;
}

function compareModuleObjects(obj1, obj2) {
  // Compare module objects excluding certain fields
  const strippedObj1 = { ...obj1 };
  const strippedObj2 = { ...obj2 };
  delete strippedObj1.moduleAddress;
  delete strippedObj2.moduleAddress;
  delete strippedObj1.exitedValidatorsCount;
  delete strippedObj2.exitedValidatorsCount;
  delete strippedObj1.active;
  delete strippedObj2.active;

  for (const key in strippedObj1) {
    if (strippedObj1[key] !== strippedObj2[key]) {
      return false;
    }
  }

  return true;
}

// Function to check the structure of the response
function checkResponseStructure(response) {
  return (
    response &&
    response.hasOwnProperty('data') &&
    response.hasOwnProperty('meta') &&
    response.data.hasOwnProperty('keys') &&
    response.data.hasOwnProperty('module')
  );
}

// Main function to compare endpoints
async function compareEndpoints(path = '', query = '', method = 'get', data = null) {
  const endpoint1 = `${baseEndpoint1}/${path}${query}`;
  const endpoint2 = `${baseEndpoint2}/${path}${query}`;

  const response1 = await fetchData(endpoint1, method, data);
  const response2 = await fetchData(endpoint2, method, data);

  // Check the structure of the responses
  if (!checkResponseStructure(response1) || !checkResponseStructure(response2)) {
    console.log('The responses have an incorrect structure.');
    return;
  }

  const meta1 = response1.meta;
  const meta2 = response2.meta;

  if (meta1.elBlockSnapshot.blockHash !== meta2.elBlockSnapshot.blockHash) {
    console.log('The "blockHash" property in the "meta" field is different.');
    return;
  }

  const data1 = response1.data;
  const data2 = response2.data;

  const keys1 = data1.keys;
  const keys2 = data2.keys;

  // Sort data arrays by "key"
  keys1.sort((a, b) => a.key.localeCompare(b.key));
  keys2.sort((a, b) => a.key.localeCompare(b.key));

  // Check if the lists of keys have the same length
  if (keys1.length !== keys2.length) {
    console.log('The lists of keys have different lengths.');
    return;
  }

  // Compare each key in the lists (assuming they are strings)
  for (let i = 0; i < keys1.length; i++) {
    if (!compareKeyObjects(keys1[i], keys2[i])) {
      console.log(`Key at index ${i} is different.`);
      return;
    }
  }

  // Check the 'module' structure
  const module1 = data1.module;
  const module2 = data2.module;

  if (!compareModuleObjects(module1, module2)) {
    console.log(`Module is different , id of module1 ${module1.id} id of module2 ${module2.id}`);
    console.log(module1, module2);
    return;
  }

  console.log('The data and module structures are equivalent.');
}

async function runComparison() {
  console.log('Comparing /modules/1/keys endpoints with used query parameter:');
  await compareEndpoints('v1/modules/1/keys', '?used=true');

  console.log('Comparing /modules/1/keys endpoints with unused query parameter:');
  await compareEndpoints('v1/modules/1/keys', '?used=false');

  console.log('\nComparing /modules/1/keys endpoints without query parameter:');
  await compareEndpoints('v1/modules/1/keys');

  const pubkey = process.env.PUBKEY_FOR_TEST;

  console.log('\nCompare v1/modules/1/keys/find');
  const pubkeys = [pubkey];
  await compareEndpoints('v1/modules/1/keys/find', '', 'post', { pubkeys });
}

// Call the main function to start the comparison
runComparison();
