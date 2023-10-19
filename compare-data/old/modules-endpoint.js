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
  return response && response.hasOwnProperty('data') && response.hasOwnProperty('elBlockSnapshot');
}

// Main function to compare endpoints
async function compareEndpoints(path = '') {
  const endpoint1 = `${baseEndpoint1}/${path}`;
  const endpoint2 = `${baseEndpoint2}/${path}`;

  const response1 = await fetchData(endpoint1);
  const response2 = await fetchData(endpoint2);

  // Check the structure of the responses
  if (!checkResponseStructure(response1) || !checkResponseStructure(response2)) {
    console.log('The responses have an incorrect structure.');
    return;
  }

  if (response1.elBlockSnapshot.blockHash !== response2.elBlockSnapshot.blockHash) {
    console.log('The "blockHash" property in the "meta" field is different.');
    return;
  }

  if (Array.isArray(response1.data)) {
    if (!Array.isArray(response2.data)) {
      console.log('The responses are incorrect,  one of them is array, another one is not');
      return;
    }

    const modules1 = response1.data;
    const modules2 = response2.data;

    if (modules1.length != modules2.length) {
      console.log('The "data" arrays have different lengths.');
      return;
    }

    for (let i = 0; i < modules1; i++) {
      if (!compareModuleObjects(modules1[i], modules2[i])) {
        console.log(`Module at index ${i} is different.`);
        return;
      }
    }
  } else {
    const module1 = response1.data;
    const module2 = response2.data;

    if (!compareModuleObjects(module1, module2)) {
      console.log(`Module is different , id of module1 ${module1.id} id of module2 ${module2.id}`);
      console.log(module1, module2);
      return;
    }
  }

  console.log('The data and module structures are equivalent.');
}

async function runComparison() {
  console.log('Comparing /modules/1/keys endpoints with used query parameter:');
  await compareEndpoints('v1/modules/1');

  console.log('Comparing /modules endpoints with unused query parameter:');
  await compareEndpoints('v1/modules', '?used=false');
}

// Call the main function to start the comparison
runComparison();
