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
  delete strippedObj1.index;
  delete strippedObj2.index;

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
  return response && response.hasOwnProperty('data') && response.hasOwnProperty('meta') && Array.isArray(response.data);
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

  if (data1.length !== data2.length) {
    console.log('The "data" arrays have different lengths.');
    return;
  }

  // Sort data arrays by "module.id"
  data1.sort((a, b) => a.module.id - b.module.id);
  data2.sort((a, b) => a.module.id - b.module.id);

  for (let i = 0; i < data1.length; i++) {
    const module1 = data1[i].module;
    const module2 = data2[i].module;

    if (!compareModuleObjects(module1, module2)) {
      console.log(`Module is different , id of module1 ${module1.id} id of module2 ${module2.id}`);
      console.log(module1, module2);
      return;
    }

    const keys1 = data1[i].keys;
    const keys2 = data2[i].keys;

    // Sort keys arrays by "key"
    keys1.sort((a, b) => a.key.localeCompare(b.key));
    keys2.sort((a, b) => a.key.localeCompare(b.key));

    // Check if the lists of keys have the same length
    if (keys1.length !== keys2.length) {
      console.log('The lists of keys have different lengths.');
      return;
    }

    // Compare each key in the lists (assuming they are strings)
    for (let j = 0; j < keys1.length; j++) {
      if (!compareKeyObjects(keys1[j], keys2[j])) {
        console.log(`Key at index ${j} is different.`);
        console.log(keys1[j], keys2[j]);
        return;
      }
    }
  }

  console.log('The data and module structures are equivalent.');
}

async function runComparison() {
  console.log('Comparing /modules/keys endpoints with used query parameter:');
  await compareEndpoints('v1/modules/keys', '?used=true');

  console.log('Comparing /modules/keys endpoints with unused query parameter:');
  await compareEndpoints('v1/modules/keys', '?used=false');

  console.log('Comparing /modules/keys endpoints without query parameter:');
  await compareEndpoints('v1/modules/keys');
}

// Call the main function to start the comparison
runComparison();
