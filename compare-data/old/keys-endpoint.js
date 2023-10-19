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

// Function to compare two objects, excluding the "index" field
function compareObjects(obj1, obj2) {
  // Create copies of objects without the "index" field
  const strippedObj1 = { ...obj1 };
  const strippedObj2 = { ...obj2 };
  // TODO change obj1 on old obj2 new
  // remove index from new
  delete strippedObj1.index;
  delete strippedObj2.index;

  // Convert objects to JSON strings and compare
  for (const key in strippedObj1) {
    if (strippedObj1[key] !== strippedObj2[key]) {
      return false;
    }
  }

  return true;
}

// Function to check the structure of the response
function checkResponseStructure(response) {
  return response && response.hasOwnProperty('data') && response.hasOwnProperty('meta');
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

  // Sort data arrays by "key"
  data1.sort((a, b) => a.key.localeCompare(b.key));
  data2.sort((a, b) => a.key.localeCompare(b.key));

  // Check if the lists have the same length
  if (data1.length !== data2.length) {
    console.log('The lists have different lengths.');
    return;
  }

  // Compare each object in the lists
  for (let i = 0; i < data1.length; i++) {
    if (!compareObjects(data1[i], data2[i])) {
      console.log(`Object at index ${i} is different.`);
      console.log(data1[i], data2[i]);
      return;
    }
  }

  console.log('The lists are equivalent.');
}

async function runComparison() {
  console.log('Comparing endpoints with used query parameter:');
  await compareEndpoints('v1/keys/', '?used=true');

  console.log('Comparing endpoints with unused query parameter:');
  await compareEndpoints('v1/keys/', '?used=false');

  console.log('\nComparing endpoints without query parameter:');
  await compareEndpoints('v1/keys/');

  const pubkey = process.env.PUBKEY_FOR_TEST;
  console.log('\nCompare for pubkey search');
  await compareEndpoints('v1/keys/', pubkey, '');

  console.log('\nCompare for pubkeys find method');
  const pubkeys = [pubkey];
  await compareEndpoints('v1/keys/find', '', 'post', { pubkeys });
}

// Call the main function to start the comparison
runComparison();
